#!/usr/bin/env node
/**
 * OpenClaw MCP Server for Cursor
 *
 * Implements the Model Context Protocol (MCP) over stdio.
 * Provides tools that Cursor's agent can call to execute tasks.
 *
 * Register with Cursor:
 *   cursor --add-mcp '{"name":"openclaw","command":"node","args":[".../mcp_server.mjs"]}'
 *
 * Or via .cursor/mcp.json:
 *   {
 *     "mcpServers": {
 *       "openclaw": {
 *         "command": "node",
 *         "args": ["path/to/mcp_server.mjs"]
 *       }
 *     }
 *   }
 */

import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_DIR = path.resolve(__dirname, '../../../workspace');
const PENDING_TASKS_FILE = path.join(WORKSPACE_DIR, 'cursor_tasks.json');

// ---- Pending tasks buffer (bridge between OpenClaw and Cursor) ----

function getPendingTask() {
  try {
    if (!fs.existsSync(PENDING_TASKS_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(PENDING_TASKS_FILE, 'utf8'));
    if (data.status === 'pending' && data.instruction) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

function markTaskDone(result) {
  try {
    const data = JSON.parse(fs.readFileSync(PENDING_TASKS_FILE, 'utf8'));
    data.status = 'completed';
    data.completedAt = new Date().toISOString();
    data.result = result;
    fs.writeFileSync(PENDING_TASKS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch {}
}

// ---- MCP Protocol Implementation ----

// MCP uses JSON-RPC 2.0 over stdio
// Messages are newline-delimited JSON

const STDIN = process.stdin;
const STDOUT = process.stdout;

// Readline buffer
let buffer = '';

STDIN.setEncoding('utf8');
STDIN.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop(); // keep incomplete line
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const request = JSON.parse(trimmed);
      handleRequest(request).then((response) => {
        if (response) {
          STDOUT.write(JSON.stringify(response) + '\n');
        }
      }).catch((err) => {
        sendError(request.id, -32603, 'Internal error: ' + err.message);
      });
    } catch (e) {
      // Not JSON, skip
    }
  }
});

function sendResponse(id, result) {
  const msg = { jsonrpc: '2.0', id, result };
  STDOUT.write(JSON.stringify(msg) + '\n');
}

function sendError(id, code, message) {
  const msg = { jsonrpc: '2.0', id, error: { code, message } };
  STDOUT.write(JSON.stringify(msg) + '\n');
}

async function handleRequest(request) {
  const { id, method, params } = request;

  switch (method) {
    // ---- MCP Required Methods ----

    case 'initialize': {
      sendResponse(id, {
        protocolVersion: '2025-03-26',
        capabilities: {
          tools: {},   // We support tools
          resources: {}, // We support resources
        },
        serverInfo: {
          name: 'openclaw',
          version: '1.0.0',
        },
      });
      return;
    }

    case 'notifications/initialized': {
      // No response needed for notifications
      return null;
    }

    case 'tools/list': {
      sendResponse(id, {
        tools: [
          {
            name: 'execute',
            description: '在本地电脑上执行 shell 命令，返回命令输出结果。用于运行代码、编译、检查文件等。',
            inputSchema: {
              type: 'object',
              properties: {
                command: { type: 'string', description: '要执行的 shell 命令' },
                cwd: { type: 'string', description: '工作目录（可选，默认 D:/Solo）' },
                timeout: { type: 'number', description: '超时秒数（可选，默认 30）' },
              },
              required: ['command'],
            },
          },
          {
            name: 'read_file',
            description: '读取指定文件的内容',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: '文件路径（绝对路径或相对项目目录）' },
              },
              required: ['path'],
            },
          },
          {
            name: 'write_file',
            description: '写入文件内容（创建新文件或覆盖已有文件）',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: '文件路径' },
                content: { type: 'string', description: '文件内容' },
              },
              required: ['path', 'content'],
            },
          },
          {
            name: 'list_directory',
            description: '列出目录中的文件和子目录',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: '目录路径（可选，默认 D:/Solo）' },
                recursive: { type: 'boolean', description: '是否递归列出（可选）' },
              },
            },
          },
          {
            name: 'get_latest_instruction',
            description: '获取最新一条来自叶枝君（手机飞书）的指令。当用户对你说 "问一下openclaw有什么任务" 或类似的话时，调用这个工具获取最新待执行的指令。',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'search_files',
            description: '搜索项目中的文件（支持通配符）',
            inputSchema: {
              type: 'object',
              properties: {
                pattern: { type: 'string', description: '搜索模式，如 *.ts, **/*.mjs' },
                baseDir: { type: 'string', description: '搜索根目录（可选，默认 D:/Solo）' },
              },
              required: ['pattern'],
            },
          },
        ],
      });
      return;
    }

    case 'tools/call': {
      const { name, arguments: args } = params;
      await handleToolCall(id, name, args || {});
      return;
    }

    case 'resources/list': {
      sendResponse(id, {
        resources: [
          {
            uri: 'openclaw://status',
            name: 'OpenClaw Bridge Status',
            description: '桥接服务状态信息',
            mimeType: 'application/json',
          },
        ],
      });
      return;
    }

    case 'resources/read': {
      const uri = params?.uri || '';
      if (uri === 'openclaw://status') {
        sendResponse(id, {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              status: 'running',
              pid: process.pid,
              workspace: WORKSPACE_DIR,
              pendingTask: getPendingTask() ? true : false,
              uptime: Math.floor((Date.now() - startTime) / 1000) + 's',
            }, null, 2),
          }],
        });
      } else {
        sendError(id, -32602, 'Resource not found: ' + uri);
      }
      return;
    }

    default: {
      sendError(id, -32601, 'Method not found: ' + method);
      return;
    }
  }
}

async function handleToolCall(id, name, args) {
  try {
    let result;

    switch (name) {
      case 'execute': {
        const { command, cwd = 'D:/Solo', timeout = 30 } = args;
        try {
          const output = execSync(command, {
            cwd,
            timeout: timeout * 1000,
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024,
            windowsHide: true,
          });
          result = { output, exitCode: 0 };
        } catch (e) {
          result = {
            output: e.stdout || '',
            error: e.stderr || e.message,
            exitCode: e.status || 1,
          };
        }
        break;
      }

      case 'read_file': {
        let filePath = args.path;
        if (!path.isAbsolute(filePath)) {
          filePath = path.resolve('D:/Solo', filePath);
        }
        const content = fs.readFileSync(filePath, 'utf8');
        result = { content, path: filePath, size: content.length };
        break;
      }

      case 'write_file': {
        let filePath = args.path;
        if (!path.isAbsolute(filePath)) {
          filePath = path.resolve('D:/Solo', filePath);
        }
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, args.content, 'utf8');
        result = { success: true, path: filePath, size: args.content.length };
        break;
      }

      case 'list_directory': {
        const dirPath = args.path || 'D:/Solo';
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        const items = entries.map(e => ({
          name: e.name,
          type: e.isDirectory() ? 'directory' : 'file',
          size: e.isFile() ? fs.statSync(path.join(dirPath, e.name)).size : null,
        }));
        if (args.recursive) {
          // Add recursive listing
          const allItems = [];
          function walk(dir, prefix) {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const e of entries) {
              const fullPath = path.join(dir, e.name);
              allItems.push({
                name: path.join(prefix, e.name),
                type: e.isDirectory() ? 'directory' : 'file',
                size: e.isFile() ? fs.statSync(fullPath).size : null,
              });
              if (e.isDirectory()) walk(fullPath, path.join(prefix, e.name));
            }
          }
          walk(dirPath, '');
          result = { items: allItems, total: allItems.length };
        } else {
          result = { items, path: dirPath, total: items.length };
        }
        break;
      }

      case 'get_latest_instruction': {
        const pending = getPendingTask();
        if (pending) {
          result = {
            hasInstruction: true,
            taskId: pending.taskId,
            timestamp: pending.timestamp,
            instruction: pending.instruction,
            note: '执行完成后告诉我，我会自动标记完成',
          };
        } else {
          result = {
            hasInstruction: false,
            note: '当前没有待执行的指令',
          };
        }
        break;
      }

      case 'search_files': {
        const { pattern, baseDir = 'D:/Solo' } = args;
        // Use dir /s /b for quick recursive search on Windows
        const searchCmd = `dir "${baseDir}\\${pattern}" /s /b /a-d 2>nul`;
        try {
          const output = execSync(searchCmd, { encoding: 'utf8', timeout: 10000, windowsHide: true });
          const files = output.trim().split('\n').filter(Boolean);
          result = { files, total: files.length, pattern };
        } catch {
          result = { files: [], total: 0, pattern };
        }
        break;
      }

      default: {
        sendError(id, -32602, 'Tool not found: ' + name);
        return;
      }
    }

    sendResponse(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
  } catch (err) {
    sendError(id, -32603, err.message);
  }
}

const startTime = Date.now();

// Send startup log to stderr so it's visible in Cursor's MCP logs
console.error(`[openclaw-mcp] Server started (PID: ${process.pid})`);
console.error(`[openclaw-mcp] Workspace: ${WORKSPACE_DIR}`);
console.error(`[openclaw-mcp] Pending tasks: ${PENDING_TASKS_FILE}`);

// Keep alive
setInterval(() => {}, 60000);
