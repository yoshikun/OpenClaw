#!/usr/bin/env node
/**
 * Send a task to Cursor via file queue.
 *
 * Usage:
 *   node send_to_cursor.mjs "指令内容"
 *   node send_to_cursor.mjs --project "D:/Solo" "指令内容"
 *
 * Writes the task to .cursor/tasks/pending.md in the project.
 * Also updates .cursor/tasks/status.json with task metadata.
 */

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
let projectDir = process.env.PROJECT_DIR || 'D:/Solo';

const projectIdx = args.indexOf('--project');
if (projectIdx >= 0) {
  projectDir = args[projectIdx + 1];
  args.splice(projectIdx, 2);
}

const instruction = args.join(' ').trim();
if (!instruction) {
  console.error('Usage: node send_to_cursor.mjs [--project <dir>] <instruction>');
  process.exit(1);
}

const tasksDir = path.join(projectDir, '.cursor', 'tasks');
const pendingFile = path.join(tasksDir, 'pending.md');
const statusFile = path.join(tasksDir, 'status.json');

// Ensure dir
fs.mkdirSync(tasksDir, { recursive: true });

const now = new Date();
const timestamp = now.toISOString();
const taskId = Date.now().toString(36);

// Write pending task
const content = `# Pending Task

- **ID:** ${taskId}
- **Time:** ${now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
- **From:** 叶枝君 (via Feishu)

## Instruction

${instruction}
`;

fs.writeFileSync(pendingFile, content, 'utf8');

// Write status
const status = {
  taskId,
  timestamp,
  instruction,
  status: 'pending',
  created: true,
};
fs.writeFileSync(statusFile, JSON.stringify(status, null, 2), 'utf8');

console.log(`[OK] Task sent to Cursor`);
console.log(`  Project: ${projectDir}`);
console.log(`  Task ID: ${taskId}`);
console.log(`  File:    ${pendingFile}`);
console.log(`  Instruction: ${instruction.substring(0, 100)}${instruction.length > 100 ? '...' : ''}`);
