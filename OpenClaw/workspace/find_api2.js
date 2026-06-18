const fs = require('fs');
const path = require('path');

const root = 'C:\\Users\\yyzypublic\\Downloads\\小程序解包\\涨棋网';

// Find the ajax service definition - webService paths
function searchFile(fp, pattern) {
  if (!fs.existsSync(fp)) return;
  const content = fs.readFileSync(fp, 'utf8');
  const lines = content.split('\n');
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      if (!found) { 
        console.log(`\n=== ${fp.replace(root, '')} ===`);
        found = true;
      }
      console.log(`  L${i+1}: ${lines[i].substring(0, 350)}`);
    }
  }
}

console.log('=== Searching for webService / HTTP client definitions ===');
// Search for webService or ajax definitions
searchFile(path.join(root, 'utils', 'ajax.js'), /baseURL|webService|upload|baseUrl|axios|\.post|\.get|\.request/);

// Search for camera page
console.log('\n=== Searching camera page ===');
const cameraDir = path.join(root, 'pages', 'camera');
if (fs.existsSync(cameraDir)) {
  const items = fs.readdirSync(cameraDir);
  for (const item of items) {
    if (item.endsWith('.js')) {
      const fp = path.join(cameraDir, item);
      const content = fs.readFileSync(fp, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('camera') || lines[i].includes('upload') || lines[i].includes('photo') || 
            lines[i].includes('recognize') || lines[i].includes('count') || lines[i].includes('hand') ||
            lines[i].includes('image') || lines[i].includes('tempFile') || lines[i].includes('compress') ||
            lines[i].includes('webService') || lines[i].includes('.post') || lines[i].includes('.get') ||
            lines[i].includes('wx.upload') || lines[i].includes('chooseImage')) {
          console.log(`  L${i+1}: ${lines[i].substring(0, 350)}`);
        }
      }
    }
  }
}

// Search for recognize-result page
console.log('\n=== Searching recognize-result page ===');
const recDir = path.join(root, 'pages', 'recognize-result');
if (fs.existsSync(recDir)) {
  const items = fs.readdirSync(recDir);
  for (const item of items) {
    if (item.endsWith('.js')) {
      const fp = path.join(recDir, item);
      const content = fs.readFileSync(fp, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('upload') || lines[i].includes('recognize') || lines[i].includes('count') || 
            lines[i].includes('hand') || lines[i].includes('tempFile') || lines[i].includes('image') ||
            lines[i].includes('webService') || lines[i].includes('.post') || lines[i].includes('.get') ||
            lines[i].includes('wx.upload') || lines[i].includes('result') || lines[i].includes('ai')) {
          console.log(`  L${i+1}: ${lines[i].substring(0, 350)}`);
        }
      }
    }
  }
}

// Search for handcount component (hand count = 拍照数子)
console.log('\n=== Searching ai-handcount component ===');
const hcDir = path.join(root, 'components', 'ai-handcount');
if (fs.existsSync(hcDir)) {
  const items = fs.readdirSync(hcDir);
  for (const item of items) {
    if (item.endsWith('.js')) {
      const fp = path.join(hcDir, item);
      const content = fs.readFileSync(fp, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        console.log(`  L${i+1}: ${lines[i].substring(0, 350)}`);
      }
    }
  }
}
