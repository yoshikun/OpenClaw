const fs = require('fs');
const path = require('path');

const root = 'C:\\Users\\yyzypublic\\Downloads\\小程序解包\\涨棋网';

function grep(dir, pattern, nameFilter) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fp = path.join(dir, item);
    const st = fs.statSync(fp);
    if (st.isDirectory()) { grep(fp, pattern, nameFilter); continue; }
    if (nameFilter && !fp.includes(nameFilter)) continue;
    if (!fp.endsWith('.js')) continue;
    const content = fs.readFileSync(fp, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        console.log(`\n--- ${fp.replace(root, '')} :${i+1} ---`);
        // Show 3 lines of context
        for (let j = Math.max(0, i-1); j <= Math.min(lines.length-1, i+2); j++) {
          console.log(`  ${j+1}: ${lines[j].substring(0, 300)}`);
        }
      }
    }
  }
}

console.log('=== Searching for API calls in camera & recognize pages ===');
grep(root, /weiqi|recognize|upload|handcount|chb2/, 'camera');
grep(root, /weiqi|recognize|upload|handcount|chb2/, 'recognize-result');

console.log('\n=== Searching main app/service files for weiqi API ===');
const mainFiles = ['appservice.app.js', 'common.app.js', 'app-service.js'];
for (const f of mainFiles) {
  const fp = path.join(root, f);
  if (fs.existsSync(fp)) {
    const content = fs.readFileSync(fp, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('weiqi') || lines[i].includes('chb2') || lines[i].includes('zhangqi')) {
        console.log(`\n--- ${f} :${i+1} ---`);
        for (let j = Math.max(0, i-1); j <= Math.min(lines.length-1, i+5); j++) {
          console.log(`  ${j+1}: ${lines[j].substring(0, 300)}`);
        }
      }
    }
  }
}
