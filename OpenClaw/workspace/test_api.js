const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

function postJSON(url, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(data);
    const opts = {
      hostname: u.hostname, port: u.port || 443, path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'zhq-client-type': 'miniprogram.windows',
        'zhq-client-version': '1.1.272',
        'zhq-client-edition': 'production'
      },
      timeout: 15000
    };
    const proto = u.protocol === 'https:' ? https : http;
    const req = proto.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({status: res.statusCode, headers: res.headers, body: d.substring(0, 2000)}));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

function postForm(url, fields, filePath) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    const parts = [];
    
    function add(str) { parts.push(Buffer.from(str)); }
    
    for (const [k, v] of Object.entries(fields)) {
      add('--' + boundary + '\r\n');
      add('Content-Disposition: form-data; name="' + k + '"\r\n\r\n');
      add(v + '\r\n');
    }
    
    if (filePath && fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);
      add('--' + boundary + '\r\n');
      add('Content-Disposition: form-data; name="file"; filename="' + fileName + '"\r\n');
      add('Content-Type: image/jpeg\r\n\r\n');
      parts.push(fileContent);
      add('\r\n');
    }
    add('--' + boundary + '--\r\n');
    
    const body = Buffer.concat(parts);
    const opts = {
      hostname: u.hostname, port: u.port || 443, path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': body.length,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'zhq-client-type': 'miniprogram.windows',
        'zhq-client-version': '1.1.272',
        'zhq-client-edition': 'production'
      },
      timeout: 20000
    };
    const proto = u.protocol === 'https:' ? https : http;
    const req = proto.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({status: res.statusCode, headers: res.headers, body: d.substring(0, 2000)}));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

async function main() {
  // Create test image
  const testImg = path.join(__dirname, 'test.jpg');
  if (!fs.existsSync(testImg)) {
    const jpeg = Buffer.alloc(100);
    jpeg[0] = 0xFF; jpeg[1] = 0xD8; // SOI
    jpeg[2] = 0xFF; jpeg[3] = 0xD9; // EOI (minimal valid JPEG)
    fs.writeFileSync(testImg, jpeg);
  }

  console.log('=== 1. POST multipart to production (no token) ===');
  try {
    const r = await postForm('https://www.zhangqi.com.cn/mp/api/image/recognize', {mime: 'image/jpeg'}, testImg);
    console.log('Status:', r.status, 'Body:', r.body);
  } catch(e) { console.log('Error:', e.message); }

  console.log('\n=== 2. POST JSON to production (no token) ===');
  try {
    const r = await postJSON('https://www.zhangqi.com.cn/mp/api/image/recognize', {mime: 'image/jpeg'});
    console.log('Status:', r.status, 'Body:', r.body);
  } catch(e) { console.log('Error:', e.message); }

  console.log('\n=== 3. Login API with fake code ===');
  try {
    const r = await postJSON('https://www.zhangqi.com.cn/mp/api/user/login', {code: 'test123'});
    console.log('Status:', r.status, 'Body:', r.body);
  } catch(e) { console.log('Error:', e.message); }

  console.log('\n=== 4. Testing server multipart ===');
  try {
    const r = await postForm('https://weiqi.chb2.cn/mp/api/image/recognize', {mime: 'image/jpeg'}, testImg);
    console.log('Status:', r.status, 'Body:', r.body);
  } catch(e) { console.log('Error:', e.message); }

  console.log('\n=== 5. GET homepage ===');
  try {
    const r = await postJSON('https://www.zhangqi.com.cn/', {});
    console.log('Status:', r.status, 'Body:', r.body);
  } catch(e) { console.log('Error:', e.message); }

  console.log('\n=== 6. Try common API paths ===');
  const paths = [
    '/api/v1/recognize',
    '/api/recognize',
    '/api/upload',
    '/mp/api/v1/image/recognize'
  ];
  for (const p of paths) {
    try {
      const r = await postForm('https://www.zhangqi.com.cn' + p, {mime: 'image/jpeg'}, testImg);
      console.log(p, '-> Status:', r.status, 'Body:', r.body.substring(0, 200));
    } catch(e) { console.log(p, '-> Error:', e.message); }
  }

  console.log('\n=== 7. Try with zhq-client-type header set to miniprogram ===');
  try {
    const u = new URL('https://www.zhangqi.com.cn/mp/api/image/recognize');
    const body = Buffer.from('');
    const opts = {
      hostname: u.hostname, port: 443, path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': 0,
        'zhq-client-type': 'miniprogram.windows',
        'zhq-client-version': '1.1.272',
        'zhq-client-edition': 'production'
      },
      timeout: 10000
    };
    const r = await new Promise((resolve, reject) => {
      const req = https.request(opts, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve({status: res.statusCode, headers: res.headers, body: d.substring(0, 500)}));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      req.end();
    });
    console.log('Status:', r.status, 'Body:', r.body);
  } catch(e) { console.log('Error:', e.message); }
}

main().catch(console.error);
