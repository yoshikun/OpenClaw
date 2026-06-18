import fs from 'fs';

const cookies = JSON.parse(fs.readFileSync(
  'C:\\Users\\yyzypublic\\.openclaw\\workspace\\github_cookies.json', 'utf8'));

// Build cookie string for API (only non-session cookies for longer validity)
const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
const headers = { 'Cookie': cookieStr, 'Accept': 'application/json', 'User-Agent': 'OpenClaw' };
const jsonHeaders = { ...headers, 'Content-Type': 'application/json' };

async function main() {
  // 1. Check current user
  const userRes = await fetch('https://api.github.com/user', { headers });
  const user = await userRes.json();
  console.log('User:', user.login, '| ID:', user.id);

  if (!user.login) {
    console.error('Auth failed:', JSON.stringify(user));
    process.exit(1);
  }

  // 2. Create repo
  const createRes = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      name: 'OpenClaw',
      description: 'OpenClaw agent backup - skills, memory, workflow & config',
      private: false,
      auto_init: true
    })
  });
  const repo = await createRes.json();
  console.log('Repo:', repo.full_name, '| URL:', repo.html_url);

  if (repo.message) {
    if (repo.message === 'name already exists on this account') {
      console.log('Repo already exists, will use existing.');
    } else {
      console.error('Failed:', repo.message);
      process.exit(1);
    }
  }
}
main().catch(e => { console.error(e); process.exit(1); });
