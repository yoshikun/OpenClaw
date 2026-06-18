const fs = require('fs');
const path = require('path');
const root = 'C:\\Users\\yyzypublic\\Downloads\\小程序解包\\涨棋网';

// Extract camera.js code (line 282)
const fp = path.join(root, 'app-service.js');
const content = fs.readFileSync(fp, 'utf8');
const lines = content.split('\n');

console.log('=== Camera Page (pages/camera/camera.js) ===');
for (let i = 280; i < 285; i++) {
  console.log(`L${i+1}: ${lines[i].substring(0, 500)}`);
}

console.log('\n=== Recognize Result Page (pages/recognize-result/recognize-result.js) ===');
for (let i = 318; i < 323; i++) {
  console.log(`L${i+1}: ${lines[i].substring(0, 500)}`);
}

console.log('\n=== Ajax utility (utils/ajax.js) - line 152 ===');
console.log(lines[151]);

console.log('\n=== Ai-handcount component (components/ai-handcount/ai-handcount.js) - line 237 ===');
console.log(lines[236]);

console.log('\n=== Ai-mode component (components/ai-mode/ai-mode.js) - line 259 ===');
for (let i = 258; i < 264; i++) {
  console.log(`L${i+1}: ${lines[i].substring(0, 500)}`);
}
