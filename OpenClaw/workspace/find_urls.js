const fs = require('fs');
const path = require('path');

const root = 'C:\\Users\\yyzypublic\\Downloads\\小程序解包\\涨棋网';
const urls = new Set();

function walk(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fp = path.join(dir, item);
    const st = fs.statSync(fp);
    if (st.isDirectory()) { walk(fp); continue; }
    if (!fp.endsWith('.js') && !fp.endsWith('.json')) continue;
    const content = fs.readFileSync(fp, 'utf8');
    const matches = content.match(/https?:\/\/[^"'\s<>,\]]*/g);
    if (matches) matches.forEach(m => urls.add(m));
  }
}

walk(root);
const sorted = [...urls].sort();
sorted.forEach(u => console.log(u));
