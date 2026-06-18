const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const filePath = 'C:\\Users\\yyzypublic\\Downloads\\__APP__.wxapkg';
const b = fs.readFileSync(filePath);

console.log('File size:', b.length);

// Check magic
const magic = b.slice(0, 6).toString();
console.log('Magic:', magic, JSON.stringify(magic));

// Check info bytes after magic
console.log('Bytes 6-20 hex:', b.slice(6, 20).toString('hex'));

// Try to find valid compressed data by XORing with first few bytes
// PC wxapkg format: magic(6 bytes) + info + XOR-encrypted zlib data
// The XOR key is often the first few bytes of the file or based on file name

// Method 1: Try XOR with magic bytes
function tryXor(buf, key) {
  const result = Buffer.alloc(buf.length);
  for (let i = 0; i < buf.length; i++) {
    result[i] = buf[i] ^ key[i % key.length];
  }
  return result;
}

// Try with 'V1MMWX'
const key1 = Buffer.from('V1MMWX');
const dec1 = tryXor(b, key1);
console.log('\nXOR with V1MMWX, checking for zlib at various offsets:');
for (let o = 0; o < Math.min(500, b.length - 2); o++) {
  if ((dec1[o] === 0x78 && (dec1[o+1] === 0x01 || dec1[o+1] === 0x5e || dec1[o+1] === 0x9c || dec1[o+1] === 0xda))) {
    console.log('  zlib found at offset', o, 'hex:', dec1.slice(o, o+4).toString('hex'));
  }
  // Also check JSON-like patterns
  if (dec1[o] === 0x7b) { // '{'
    const snippet = dec1.slice(o, o+20).toString('utf8');
    if (snippet.startsWith('{') || snippet.startsWith('[')) {
      console.log('  potential JSON at', o, ':', snippet);
    }
  }
}

// Look for file entries - in wxapkg format, there's usually a table of contents
// Try reading as a structured index
// Standard wxapkg format (some versions):
// Header: magic(1 byte) + info
// Index: list of (nameLen, name, offset, size) pairs
// Then file data

// Check if it might be a known structure
console.log('\nFile structure analysis:');
// Read as unsigned ints
const readU32 = (off) => b.readUInt32LE(off);
console.log('U32 at 0:', readU32(0).toString(16));
console.log('U32 at 4:', readU32(4).toString(16));
console.log('U32 at 8:', readU32(8).toString(16));
console.log('U32 at 12:', readU32(12).toString(16));
console.log('U32 at 16:', readU32(16).toString(16));
console.log('U32 at 20:', readU32(20).toString(16));

// Look for readable strings
let offsets = [];
for (let i = 0; i < b.length - 10; i += 4) {
  const v = readU32(i);
  if (v > 0 && v < b.length && (b[i+4] > 0 && b[i+4] < 200)) {
    // could be offset/size pair
    offsets.push({off: i, val: v});
  }
}

// Search for common file extensions
const searchStr = (str) => {
  const idx = b.indexOf(str);
  if (idx >= 0) console.log('  Found', JSON.stringify(str), 'at offset', idx);
};
['.js', '.json', '.html', '.wxss', '.wxml', '.png', '.jpg', '.svg', '.wxs', 'app.js', 'app.json', 'pages/', 'components/'].forEach(s => searchStr(s));
