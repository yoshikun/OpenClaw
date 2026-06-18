#!/usr/bin/env node
/**
 * Send instruction to Cursor via HTTP bridge extension.
 *
 * The Cursor Bridge extension runs an HTTP server on http://127.0.0.1:18792.
 * This script POSTs the instruction to /execute.
 *
 * Usage:
 *   node instruct_cursor.mjs "your instruction"
 *   curl -X POST http://127.0.0.1:18792/execute -H "Content-Type: application/json" -d '{"instruction":"hi"}'
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_DIR = path.resolve(__dirname, '../../../workspace');
const TASKS_FILE = path.join(WORKSPACE_DIR, 'cursor_tasks.json');

const PORT = 18792;
const instruction = process.argv.slice(2).join(' ').trim();

if (!instruction) {
  console.error('Usage: node instruct_cursor.mjs <instruction>');
  process.exit(1);
}

// Also save as fallback task file (for MCP path)
const task = {
  taskId: Date.now().toString(36),
  timestamp: new Date().toISOString(),
  timeLabel: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
  from: '叶枝君 (手机飞书)',
  instruction,
  status: 'pending',
};
fs.writeFileSync(TASKS_FILE, JSON.stringify(task, null, 2), 'utf8');

console.log(`[bridge] Sending instruction to Cursor extension (http://127.0.0.1:${PORT}/execute)...`);
console.log(`[bridge] Instruction: ${instruction.substring(0, 120)}...`);

const postData = JSON.stringify({ instruction });

const req = http.request({
  hostname: '127.0.0.1',
  port: PORT,
  path: '/execute',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  },
  timeout: 10000,
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(body);
      if (result.success) {
        console.log(`[bridge] ✅ ${result.message}`);
        // Update task status
        try {
          const t = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
          t.status = 'completed';
          t.deliveredAt = new Date().toISOString();
          t.deliveryMethod = 'http';
          fs.writeFileSync(TASKS_FILE, JSON.stringify(t, null, 2), 'utf8');
        } catch (_) {}
        process.exit(0);
      } else {
        console.log(`[bridge] ⚠️  ${result.message}`);
        process.exit(1);
      }
    } catch (e) {
      console.log(`[bridge] Response: ${body.substring(0, 300)}`);
      process.exit(2);
    }
  });
});

req.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    console.log(`[bridge] ❌ Cannot connect to Cursor extension at port ${PORT}`);
    console.log(`[bridge]    Is Cursor running with the bridge extension?`);
    console.log(`[bridge]    Restart Cursor and try again.`);
    console.log(``);
    console.log(`[bridge]    ⏩ Fallback: Instruction saved to cursor_tasks.json`);
    console.log(`[bridge]    In Cursor Agent, type: "检查一下 openclaw 有什么任务"`);
  } else {
    console.log(`[bridge] ❌ Connection error: ${err.message}`);
  }
  process.exit(2);
});

req.write(postData);
req.end();
