const fs = require('fs');
const path = require('path');
const root = 'C:\\Users\\yyzypublic\\Downloads\\小程序解包\\涨棋网';
const fp = path.join(root, 'app-service.js');
const content = fs.readFileSync(fp, 'utf8');

// Find onUserLogin and onLoginFail full code
const userIdx = content.indexOf('onUserLogin');
if (userIdx >= 0) {
  // Find the full App block
  const appBlock = content.substring(0, 200000); // First 200k chars should contain app.js
  const appMatch = appBlock.match(/App\(\{[^]*?onUserLogin\s*:\s*function[^}]*?\}/);
  
  // Try finding by keyword
  const patterns = [
    {name: 'onUserLogin', pat: /onUserLogin\s*(:|=)\s*function\s*\([^)]*\)\s*\{[^}]*\}[,)]?/},
    {name: 'onLoginFail', pat: /onLoginFail\s*(:|=)\s*function\s*\([^)]*\)\s*\{[^}]*\}[,)]?/},
    {name: 'refreshTastes', pat: /refreshTastes[^}]*\}[^}]*\}[^}]*\}[^}]*\}[^}]*\}[^}]*\}/} // Deep function
  ];
  
  for (const p of patterns) {
    const m = content.match(p.pat);
    if (m) {
      console.log('=== ' + p.name + ' ===');
      console.log(m[0].substring(0, 2000));
      console.log();
    }
  }
}

// Look at the env.js for any refresh or token endpoint
console.log('=== All API endpoints mentioned in code ===');
const apis = new Set();
const apiMatches = content.matchAll(/"([a-z]+\/[a-z]+(?:\/[a-z]+)*)"/g);
for (const m of apiMatches) {
  const api = m[1];
  if (api.startsWith('image/') || api.startsWith('user/') || api.startsWith('log')) {
    apis.add(api);
  }
}
[...apis].sort().forEach(a => console.log('  ' + a));
