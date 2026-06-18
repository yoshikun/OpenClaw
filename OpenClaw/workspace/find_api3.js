const fs = require('fs');
const path = require('path');
const root = 'C:\\Users\\yyzypublic\\Downloads\\小程序解包\\涨棋网';

// Search in the main bundled JS files
const mainFiles = ['appservice.app.js', 'app-service.js', 'common.app.js'];
const patterns = [
  /pages\/camera/,
  /pages\/recognize/,
  /ai-handcount/,
  /uploadFile|uploadImage/,
  /compressImage/,
  /chooseImage|chooseMessageFile/,
  /webService/,
  /\.post\(|\.get\(|\.put\(|\.delete\(/,
  /handcount|hand_count|handCount/,
  /recognize|Recognize/,
  /photo/,
  /拍照|数子/
];

for (const name of mainFiles) {
  const fp = path.join(root, name);
  if (!fs.existsSync(fp)) continue;
  console.log(`\n========== Searching ${name} ==========`);
  const content = fs.readFileSync(fp, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const p of patterns) {
      if (p.test(lines[i])) {
        console.log(`  L${i+1}: ${lines[i].substring(0, 350)}`);
        break;
      }
    }
  }
}
