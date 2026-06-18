// Generate a GitHub Personal Access Token using session cookies
import fs from 'fs';

const cookies = JSON.parse(fs.readFileSync('C:/Users/yyzypublic/.openclaw/workspace/github_cookies.json','utf8'));
const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
const headers = { Cookie: cookieStr, 'User-Agent': 'OpenClaw' };

async function main() {
  // Step 1: Get the token creation page to find the CSRF token
  console.log('Fetching token creation page...');
  const pageRes = await fetch('https://github.com/settings/tokens/new', { headers, redirect: 'manual' });
  const html = await pageRes.text();
  
  // Find CSRF tokens
  const tokenMatch = html.match(/<input type="hidden" name="authenticity_token" value="([^"]+)"/);
  if (!tokenMatch) {
    console.log('No standard authenticity_token found, trying turbo-frame...');
    // Try to find the CSRF token from a meta tag
    const csrfMatch = html.match(/<meta name="csrf-token"[^>]+content="([^"]+)"/);
    if (csrfMatch) {
      console.log('CSRF token found via meta tag:', csrfMatch[1].substring(0, 30) + '...');
    }
    
    // Look for the token creation form URL
    const formMatch = html.match(/action="([^"]*tokens[^"]*)"/);
    if (formMatch) {
      console.log('Form action:', formMatch[1]);
    }
    
    // Try to extract any authenticity token
    const anyToken = html.match(/authenticity_token[^>]+value="([^"]+)"/);
    if (anyToken) {
      console.log('Found some authenticity token');
    }
    
    // Check if it redirected (needs login)
    console.log('Status:', pageRes.status);
    const lines = html.substring(0, 500).split('\n').filter(l => l.trim());
    lines.forEach((l, i) => console.log(i, l.trim().substring(0, 120)));
  } else {
    console.log('Authenticity token:', tokenMatch[1].substring(0, 30) + '...');
  }
}

main().catch(e => console.error(e));
