const fs = require('fs');
const path = require('path');
const root = 'C:\\Users\\yyzypublic\\Downloads\\小程序解包\\涨棋网';

const fp = path.join(root, 'app-service.js');
const content = fs.readFileSync(fp, 'utf8');
const lines = content.split('\n');

// Find the login method in app.js (line 186+)
console.log('=== App.js onLaunch and login methods ===');
for (let i = 185; i < Math.min(240, lines.length); i++) {
  const line = lines[i];
  if (line.includes('login') || line.includes('wx.login') || line.includes('setToken') || 
      line.includes('getUser') || line.includes('userInfo') || line.includes('setData') ||
      line.includes('globalData') || line.includes('onLaunch')) {
    console.log(`L${i+1}: ${line.substring(0, 500)}`);
  }
}

// Find the user.js module - look for its contents
console.log('\n=== User module (utils/user.js) ===');
for (let i = 179; i < 181; i++) {
  console.log(`L${i+1}: ${lines[i].substring(0, 600)}`);
}

// Search for the login function
console.log('\n=== Searching for login() function ===');
for (let i = 185; i < 210; i++) {
  if (lines[i].includes('.login=') || lines[i].includes('login:') || lines[i].includes('this.login')) {
    console.log(`L${i+1}: ${lines[i].substring(0, 1000)}`);
  }
}
