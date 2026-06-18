const fs = require('fs');
const path = require('path');
const root = 'C:\\Users\\yyzypublic\\Downloads\\小程序解包\\涨棋网';
const fp = path.join(root, 'app-service.js');
const content = fs.readFileSync(fp, 'utf8');
const lines = content.split('\n');

// The app.js onLaunch and login is at line 186.
// Let me see the full login function
const line186 = lines[185];
// The login function should be inside the App({}) block
// Let me find it in the chunk
console.log('=== Full onLaunch/login in app.js ===');
const appStart = line186.indexOf('App({');
if (appStart >= 0) {
  let app = line186.substring(appStart);
  // Find the login method
  const loginIdx = app.indexOf('login:');
  if (loginIdx >= 0) {
    console.log(app.substring(loginIdx, Math.min(loginIdx + 2000, app.length)));
  }
}

// Also search for user.js login flow
console.log('\n\n=== utils/user.js login flow ===');
const userLine = lines[179];
const userIdx = userLine.indexOf('define("utils/user.js"');
if (userIdx >= 0) {
  const userCode = userLine.substring(userIdx);
  // Search for login related functions
  const loginFnIdx = userCode.indexOf('login');
  if (loginFnIdx >= 0) {
    console.log(userCode.substring(Math.max(0, loginFnIdx - 200), Math.min(userCode.length, loginFnIdx + 1500)));
  }
}
