#!/usr/bin/env node
/**
 * Send a text message to a Feishu group chat via Feishu Open API.
 *
 * Usage:
 *   node send_feishu_msg.mjs <chat_id> <text> [--mention open_id1,name1 open_id2,name2 ...]
 *
 * Examples:
 *   # Simple text
 *   node send_feishu_msg.mjs oc_xxx "热更已完成，测试包已更新"
 *
 *   # With @mentions
 *   node send_feishu_msg.mjs oc_xxx "测试包已更新" ^
 *     --mention ou_348eeddd81d4c03865f9f1684fce6966,兵王
 *
 *   # With @mentions using inline <at> tags in text (automatic)
 *   node send_feishu_msg.mjs oc_xxx "测试包已更新 <at user_id=\"ou_xxx\">兵王</at>"
 *
 * Environment variables (or edit defaults below):
 *   FEISHU_APP_ID
 *   FEISHU_APP_SECRET
 */

import https from 'https';

// ── Defaults (edit these or override via env) ──────────────
const DEFAULT_APP_ID     = process.env.FEISHU_APP_ID     || 'cli_a9458ff380b99ccb';
const DEFAULT_APP_SECRET = process.env.FEISHU_APP_SECRET || 'Qs3NVpgH7h4UP7cVPfZRHh72E3jEOGKv';
// ───────────────────────────────────────────────────────────

function httpsPost(url, data, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const headers = { 'Content-Type': 'application/json; charset=utf-8' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const body = JSON.stringify(data);
    const opts = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(body, 'utf8') },
    };

    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.write(body, 'utf8');
    req.end();
  });
}

async function getToken(appId, appSecret) {
  const res = await httpsPost(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    { app_id: appId, app_secret: appSecret }
  );
  if (!res.tenant_access_token) {
    throw new Error(`Failed to get token: ${JSON.stringify(res)}`);
  }
  return res.tenant_access_token;
}

async function sendMessage(chatId, text, token) {
  // content field must be a JSON-encoded string
  const innerContent = JSON.stringify({ text });

  const res = await httpsPost(
    `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id`,
    {
      receive_id: chatId,
      msg_type: 'text',
      content: innerContent,
    },
    token
  );

  if (res.code !== 0) {
    throw new Error(`API error: code=${res.code} msg=${res.msg} log_id=${res.error?.log_id || '-'}`);
  }

  return res;
}

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node send_feishu_msg.mjs <chat_id> <text> [--mention id1,name1 id2,name2 ...]');
    console.error('       node send_feishu_msg.mjs oc_xxx "text" --mention ou_xxx,displayName');
    process.exit(1);
  }

  const chatId = args[0];
  let text = args[1];
  const rest = args.slice(2);

  // Parse --mention options: format --mention open_id1,name1 open_id2,name2 ...
  let mentionIdx = rest.indexOf('--mention');
  if (mentionIdx !== -1) {
    const mentionPairs = rest.slice(mentionIdx + 1).filter(p => !p.startsWith('--'));
    // Build inline <at> tags
    // Feishu format: <at user_id="open_id">display_name</at>
    const atTags = mentionPairs.map(pair => {
      const [id, ...nameParts] = pair.split(',');
      const name = nameParts.join(',') || id;
      return `<at user_id="${id}">${name}</at>`;
    });
    text += ' ' + atTags.join(' ');
  }

  return { chatId, text };
}

async function main() {
  const { chatId, text } = parseArgs();

  const appId     = process.env.FEISHU_APP_ID     || DEFAULT_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET || DEFAULT_APP_SECRET;

  const token = await getToken(appId, appSecret);
  const result = await sendMessage(chatId, text, token);

  console.log(JSON.stringify({ code: result.code, msg: result.msg, message_id: result.data?.message_id }));
  process.exit(result.code === 0 ? 0 : 1);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
