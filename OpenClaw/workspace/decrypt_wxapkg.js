"""
PC WeChat wxapkg decryption script
Usage: node decrypt_wxapkg.js --wxid <appid> [--in <input>] [--out <output>]
"""
const fs = require('fs');
const crypto = require('crypto');

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      result[key] = args[i + 1];
      i++;
    }
  }
  return result;
}

function decryptWxapkg(inputPath, outputPath, wxid) {
  console.log(`Decrypting: ${inputPath}`);
  console.log(`Output: ${outputPath}`);
  console.log(`wxid: ${wxid}`);
  
  const data = fs.readFileSync(inputPath);
  console.log(`File size: ${data.length} bytes`);
  
  // Verify magic
  const magic = data.slice(0, 6).toString();
  if (magic !== 'V1MMWX') {
    console.error('Error: Not a valid PC WeChat wxapkg (missing V1MMWX magic)');
    process.exit(1);
  }
  
  // Step 1: PBKDF2 to generate AES key
  // pass=wxid, salt="saltiest", iterations=1000, keylen=32, digest=sha1
  const key = crypto.pbkdf2Sync(wxid, 'saltiest', 1000, 32, 'sha1');
  console.log(`AES key derived (first 8 bytes hex): ${key.slice(0, 8).toString('hex')}`);
  
  // Step 2: AES-256-CBC decrypt bytes 6 to 6+1024
  const iv = Buffer.from('the iv: 16 bytes');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  // The encrypted data starts at offset 6, length 1024
  const encryptedHeader = data.slice(6, 6 + 1024);
  let decryptedHeader = decipher.update(encryptedHeader);
  decryptedHeader = Buffer.concat([decryptedHeader, decipher.final()]);
  
  // Trim to 1023 bytes (original length)
  decryptedHeader = decryptedHeader.slice(0, 1023);
  console.log(`Header decrypted (${decryptedHeader.length} bytes)`);
  console.log(`Header start: ${decryptedHeader.slice(0, 60).toString('hex')}`);
  console.log(`Header text: ${decryptedHeader.slice(0, 60).toString('utf8').replace(/[\x00-\x1f]/g, '.')}`);
  
  // Step 3: XOR decrypt the rest
  const xorKey = wxid.length >= 2 ? wxid.charCodeAt(wxid.length - 2) : 0x66;
  console.log(`XOR key: 0x${xorKey.toString(16)} ('${String.fromCharCode(xorKey)}')`);
  
  const restData = data.slice(6 + 1024);
  const decryptedRest = Buffer.alloc(restData.length);
  for (let i = 0; i < restData.length; i++) {
    decryptedRest[i] = restData[i] ^ xorKey;
  }
  
  // Step 4: Combine
  const result = Buffer.concat([decryptedHeader, decryptedRest]);
  console.log(`Decrypted output size: ${result.length} bytes`);
  
  // Check if result starts with zlib magic
  if (result[0] === 0x78 && (result[1] === 0x9c || result[1] === 0xda || result[1] === 0x01 || result[1] === 0x5e)) {
    console.log('✓ Output starts with valid zlib magic - decryption likely successful!');
  } else {
    console.log('⚠ Output does NOT start with zlib magic - wxid might be wrong');
    console.log(`  First 32 bytes: ${result.slice(0, 32).toString('hex')}`);
    console.log(`  First 64 chars: ${result.slice(0, 64).toString('utf8').replace(/[\x00-\x1f\x7f-\xff]/g, '.')}`);
  }
  
  fs.writeFileSync(outputPath, result);
  console.log('✓ Decryption complete!');
  return result;
}

// Main
const args = parseArgs();
const wxid = args.wxid;
const inputPath = args.in || 'C:\\Users\\yyzypublic\\Downloads\\__APP__.wxapkg';
const outputPath = args.out || 'C:\\Users\\yyzypublic\\.openclaw\\workspace\\decrypted.wxapkg';

if (!wxid) {
  console.log('Error: Missing --wxid parameter. You need the WeChat Mini Program AppID.');
  console.log('');
  console.log('How to find the wxid:');
  console.log('  The __APP__.wxapkg file is stored in a folder like:');
  console.log('  C:\\Users\\{你的用户名}\\Documents\\WeChat Files\\Applet\\wx2xxx84w9w7a3xxxx\\');
  console.log('  The folder name (e.g., "wx2xxx84w9w7a3xxxx") IS the wxid.');
  console.log('');
  console.log('Usage: node decrypt_wxapkg.js --wxid <appid> [--in <input>] [--out <output>]');
  process.exit(1);
}

const result = decryptWxapkg(inputPath, outputPath, wxid);

// Try to decompress and show content
try {
  const zlib = require('zlib');
  const decompressed = zlib.inflateSync(result);
  console.log(`\nDecompressed size: ${decompressed.length} bytes`);
  
  // Show first 1000 chars of decompressed content
  const text = decompressed.toString('utf8').substring(0, 2000);
  console.log('\n=== First 2000 chars of decompressed content ===');
  console.log(text);
  
  // Try to find JSON structure
  const content = decompressed.toString('utf8');
  if (content.includes('"app.json"')) {
    console.log('\n✅ Found app.json reference - this is a valid mini program!');
  }
  
  // Look for API URLs
  const urlPattern = /https?:\/\/[^\s"'<>]+/g;
  const urls = content.match(urlPattern);
  if (urls && urls.length > 0) {
    console.log('\n=== Found URLs ===');
    urls.forEach(u => console.log(`  ${u}`));
  }
} catch(e) {
  console.log(`\nDecompression failed: ${e.message}`);
  console.log('This might mean the wxid is incorrect, or the file format is different.');
}
