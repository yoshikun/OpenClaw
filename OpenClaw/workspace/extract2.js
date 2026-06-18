const fs = require('fs');
const path = require('path');
const root = 'C:\\Users\\yyzypublic\\Downloads\\小程序解包\\涨棋网';

const fp = path.join(root, 'app-service.js');
const content = fs.readFileSync(fp, 'utf8');
const lines = content.split('\n');

// Line 282: full camera page code
console.log('=== FULL camera.js code ===');
console.log(lines[281]);

console.log('\n=== FULL recognize-result.js code ===');
console.log(lines[319]);

// Find env config (service URLs)
console.log('\n=== Env config (utils/env.js) ===');
// Line 166 in the output showed env config
console.log(lines[165]);

// Find the service and webService base URL definitions
console.log('\n=== Searching for t.service / t.webService definitions (in env.js) ===');
const envLine = lines[165];
const match = envLine.match(/service:"([^"]+)".*?webService:"([^"]+)"/);
if (match) {
  console.log('service base URL:', match[1]);
  console.log('webService base URL:', match[2]);
}
// alternative match
const match2 = envLine.match(/service:\s*"([^"]+)"/);
const match3 = envLine.match(/webService:\s*"([^"]+)"/);
if (match2) console.log('service:', match2[1]);
if (match3) console.log('webService:', match3[1]);

console.log('\n=== Full env.js line ===');
console.log(lines[165].substring(0, 600));

// Search for "recognize" function name references
const recogMatch = content.match(/recognize|handCount|hand_count|uploadImage|uploadFile/);
if (recogMatch) {
  const idx = content.indexOf(recogMatch[0]);
  const start = Math.max(0, idx - 200);
  const end = Math.min(content.length, idx + 500);
  console.log('\n=== Found "recognize" context ===');
  console.log(content.substring(start, end));
}
