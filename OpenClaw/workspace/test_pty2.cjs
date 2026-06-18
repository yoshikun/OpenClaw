const pty = require('node-pty');

// Test 1: cmd.exe normal
console.log('=== Test 1: cmd.exe with echo ===');
const p1 = pty.spawn('cmd.exe', ['/c', 'echo PTY_WORKS && dir /b'], {
  name: 'xterm-256color', cols: 120, rows: 40,
  cwd: 'C:\\Users\\yyzypublic\\.openclaw\\workspace',
  env: process.env
});
p1.onData(d => process.stdout.write('[p1] ' + d.replace(/\u001b\[.*?[a-zA-Z]/g, '')));
p1.onExit(() => {});

// Test 2: cursor --version
setTimeout(() => {
  console.log('\n=== Test 2: cursor --version ===');
  const p2 = pty.spawn('cmd.exe', ['/c', 'cursor', '--version'], {
    name: 'xterm-256color', cols: 120, rows: 40,
    cwd: 'C:\\Users\\yyzypublic\\.openclaw\\workspace',
    env: process.env
  });
  p2.onData(d => process.stdout.write('[p2] ' + d.replace(/\u001b\[.*?[a-zA-Z]/g, '')));
  p2.onExit(() => {});
}, 2000);

// Test 3: cursor agent (key test!)
setTimeout(() => {
  console.log('\n=== Test 3: cursor agent ===');
  let out = '';
  const p3 = pty.spawn('cmd.exe', [], {
    name: 'xterm-256color', cols: 120, rows: 40,
    cwd: 'C:\\Users\\yyzypublic\\.openclaw\\workspace',
    env: process.env
  });
  p3.onData(d => {
    out += d;
    const clean = d.replace(/\u001b\[.*?[a-zA-Z]/g, '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
    if (clean.trim()) process.stdout.write('[p3] ' + clean);
  });
  p3.onExit(({exitCode}) => {
    console.log(`\n[p3] EXIT code=${exitCode}, outputLen=${out.length}`);
  });

  // Send cursor agent command
  setTimeout(() => {
    console.log('\n[p3] SENDING: cursor agent\n');
    p3.write('cursor agent\n');
  }, 1000);

  // After a few seconds, send a command to the agent
  setTimeout(() => {
    console.log('\n[p3] SENDING: echo hello from cursor bridge\n');
    p3.write('echo hello from cursor bridge\n');
  }, 8000);

  // Finish
  setTimeout(() => {
    console.log(`\n[p3 FINAL OUTPUT LEN: ${out.length}]`);
    const clean = out.replace(/\u001b\[.*?[a-zA-Z]/g, '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g, '');
    console.log('[p3 RAW]:', clean.substring(0, 3000));
    process.exit(0);
  }, 15000);
}, 4000);
