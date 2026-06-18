const fs = require('fs');
const path = require('path');
const root = 'C:\\Users\\yyzypublic\\Downloads\\小程序解包\\涨棋网';
const fp = path.join(root, 'app-service.js');
const content = fs.readFileSync(fp, 'utf8');

// Search for token expiry
const keywords = ['expire', 'expiry', 'exp', 'refresh', 'tokenExp', 'ttl', '时效', '有效期'];
for (const kw of keywords) {
  const idx = content.indexOf(kw);
  if (idx >= 0) {
    console.log(`=== Found "${kw}" at offset ${idx} ===`);
    const start = Math.max(0, idx - 100);
    const end = Math.min(content.length, idx + 300);
    console.log(content.substring(start, end));
    console.log();
  }
}

// Also look at the login handler - what does onUserLogin do?
const loginIdx = content.indexOf('onUserLogin');
if (loginIdx >= 0) {
  console.log('=== onUserLogin handler ===');
  const start = Math.max(0, loginIdx - 50);
  const end = Math.min(content.length, loginIdx + 1000);
  console.log(content.substring(start, end));
}

// Search for Authorization header usage - where token is checked
const authIdx = content.indexOf('Authorization');
if (authIdx >= 0) {
  console.log('\n=== Authorization header handling ===');
  const start = Math.max(0, authIdx - 50);
  const end = Math.min(content.length, authIdx + 400);
  console.log(content.substring(start, end));
}

// Check app.js for the login response handling
console.log('\n=== Login response handling ===');
const loginRespPattern = content.match(/onUserLogin\s*=\s*function[^}]+/);
if (loginRespPattern) {
  console.log(loginRespPattern[0].substring(0, 2000));
}
