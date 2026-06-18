const fs = require('fs');
const path = require('path');
const root = 'C:\\Users\\yyzypublic\\Downloads\\小程序解包\\涨棋网';

const fp = path.join(root, 'app-service.js');
const content = fs.readFileSync(fp, 'utf8');
const lines = content.split('\n');

// Find user.js or login-related code
console.log('=== Searching for login/auth in app.js (line 186) ===');
console.log(lines[185].substring(0, 1000));

// Find the user module  
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('utils/user') && lines[i].includes('login')) {
    console.log(`\n=== User module at line ${i+1} ===`);
    console.log(lines[i].substring(0, 800));
  }
}

// Search for wx.login
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('wx.login') || lines[i].includes('login')) {
    console.log(`\n=== wx.login/auth at line ${i+1} ===`);
    console.log(lines[i].substring(0, 600));
    break;
  }
}

// Search for getToken or setToken
console.log('\n=== Searching for token handling ===');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('go_chess.token') || (lines[i].includes('setToken') || lines[i].includes('getToken'))) {
    console.log(`L${i+1}: ${lines[i].substring(0, 500)}`);
  }
}

// Look for login POST endpoint
console.log('\n=== Searching for login API path ===');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('/login') || lines[i].includes('/auth') || lines[i].includes('/token') || lines[i].includes('/session')) {
    console.log(`L${i+1}: ${lines[i].substring(0, 400)}`);
  }
}
