#!/usr/bin/env node
/**
 * Cursor Agent Bridge Server (PTY version)
 *
 * Uses node-pty to create a real pseudo-terminal for cursor agent,
 * then provides HTTP API to send/receive instructions.
 *
 * Usage:
 *   node bridge_server.mjs [--port 18790] [--project "D:/Solo"]
 *
 * API:
 *   POST /execute  { "task": "..." }  →  { "success": true, "output": "..." }
 *   GET  /status
 *   GET  /health
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config
const PORT = parseInt(process.argv.find(a => a.startsWith('--port='))?.split('=')[1] || process.env.BRIDGE_PORT || '18790', 10);
let PROJECT_DIR = process.argv.find(a => a.startsWith('--project='))?.split('=')[1] || process.env.PROJECT_DIR || 'D:/Solo';

if (!fs.existsSync(PROJECT_DIR)) {
  PROJECT_DIR = process.cwd();
}

// State
let ptyProcess = null;
let agentReady = false;
let outputBuffer = '';
let taskQueue = [];
let isProcessing = false;
let currentTaskResolve = null;
let currentTaskReject = null;
let taskTimeout = null;

// ANSI / control char stripping
const ANSI_RE = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
const CTRL_RE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g;
function clean(text) {
  return text.replace(ANSI_RE, '').replace(CTRL_RE, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

// Find cursor binary
function findCursor() {
  const candidates = [
    'C:\\Users\\yyzypublic\\AppData\\Local\\Programs\\cursor\\resources\\app\\bin\\cursor.cmd',
  ];
  for (const c of candidates) {
    try {
      const r = require('child_process').execSync(`"${c}" --version 2>nul`, { encoding: 'utf8', timeout: 5000 });
      if (r) return c;
    } catch (_) {}
  }
  return 'cursor';
}

const CURSOR_BIN = findCursor();
let pty;

// Lazily load node-pty (it's a CJS module)
function getPty() {
  if (!pty) pty = require('node-pty');
  return pty;
}

function startAgent() {
  if (ptyProcess) {
    try { ptyProcess.kill(); } catch (_) {}
    ptyProcess = null;
  }

  try {
    const ptyMod = getPty();
    console.log(`[BRIDGE] Starting cursor agent via PTY...`);
    console.log(`[BRIDGE] Binary: ${CURSOR_BIN}`);
    console.log(`[BRIDGE] Project: ${PROJECT_DIR}`);

    ptyProcess = ptyMod.spawn('cmd.exe', ['/c', 'cursor', 'agent'], {
      name: 'xterm-256color',
      cols: 120,
      rows: 40,
      cwd: PROJECT_DIR,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
      },
    });

    outputBuffer = '';
    agentReady = false;

    ptyProcess.onData((data) => {
      outputBuffer += data;
      const cleanData = clean(data);

      if (!agentReady) {
        // Check for indications that agent is ready
        if (cleanData.includes('>') || cleanData.includes('●') || 
            cleanData.includes('ready') || outputBuffer.length > 200) {
          agentReady = true;
          console.log(`[BRIDGE] Agent is ready`);
        }
      }

      if (isProcessing) {
        // Check if agent is waiting for input (showing prompt)
        const lines = outputBuffer.split('\n').filter(l => clean(l).length > 0);
        const lastClean = clean(lines[lines.length - 1] || '');
        if (lastClean.endsWith('>') || lastClean.endsWith('#')) {
          completeTask();
        }
      }
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(`[BRIDGE] Agent exited (code=${exitCode}, signal=${signal})`);
      ptyProcess = null;
      agentReady = false;
      if (isProcessing) {
        isProcessing = false;
        if (currentTaskReject) {
          currentTaskReject(new Error('Agent exited'));
          currentTaskReject = null;
        }
      }
      setTimeout(startAgent, 5000);
    });

    // Mark ready after timeout
    setTimeout(() => {
      if (!agentReady && ptyProcess) {
        agentReady = true;
        console.log(`[BRIDGE] Agent assumed ready (timeout)`);
      }
    }, 15000);
  } catch (err) {
    console.error(`[BRIDGE] Failed to start agent:`, err.message);
    setTimeout(startAgent, 10000);
  }
}

function completeTask() {
  if (!isProcessing) return;
  isProcessing = false;
  if (taskTimeout) { clearTimeout(taskTimeout); taskTimeout = null; }

  const output = clean(outputBuffer);
  console.log(`[BRIDGE] Task complete (${output.length} chars)`);

  if (currentTaskResolve) {
    currentTaskResolve({ success: true, output });
    currentTaskResolve = null;
  }
  outputBuffer = '';
  setTimeout(processNextTask, 300);
}

function processNextTask() {
  if (isProcessing || taskQueue.length === 0) return;

  const task = taskQueue.shift();
  isProcessing = true;
  outputBuffer = '';

  const { instruction, resolve, reject } = task;
  currentTaskResolve = resolve;
  currentTaskReject = reject;

  if (ptyProcess) {
    const toSend = `${instruction}\n`;
    console.log(`[BRIDGE] Sending: ${instruction.substring(0, 80)}...`);
    ptyProcess.write(toSend);

    // Timeout: if agent doesn't respond within 120s, return what we have
    taskTimeout = setTimeout(() => {
      if (isProcessing) {
        console.log(`[BRIDGE] Task timeout (120s)`);
        isProcessing = false;
        const output = clean(outputBuffer);
        if (currentTaskResolve) {
          currentTaskResolve({
            success: true,
            output: output + '\n\n[Task timed out after 120s — partial output]'
          });
          currentTaskResolve = null;
        }
        outputBuffer = '';
        setTimeout(processNextTask, 300);
      }
    }, 120000);
  } else {
    isProcessing = false;
    reject(new Error('Agent not available'));
    setTimeout(processNextTask, 2000);
  }
}

// HTTP Server
function startServer() {
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    if (req.method === 'GET' && (req.url === '/status' || req.url === '/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        pid: process.pid,
        running: ptyProcess !== null,
        ready: agentReady,
        queue: taskQueue.length,
        processing: isProcessing,
        projectDir: PROJECT_DIR,
      }));
      return;
    }

    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
      return;
    }

    if (req.method === 'POST' && req.url === '/execute') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const { task } = JSON.parse(body);
          if (!task || typeof task !== 'string') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Missing "task" field' }));
            return;
          }
          if (!agentReady || !ptyProcess) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Agent not ready', queue: taskQueue.length }));
            return;
          }

          const promise = new Promise((resolve, reject) => {
            taskQueue.push({ instruction: task, resolve, reject });
          });
          if (!isProcessing) processNextTask();

          promise.then(r => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(r));
          }).catch(e => {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: e.message }));
          });
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
        }
      });
      return;
    }

    res.writeHead(404); res.end('Not found');
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`========================================`);
    console.log(` Cursor Agent Bridge`);
    console.log(` Address:  http://127.0.0.1:${PORT}`);
    console.log(` Project:  ${PROJECT_DIR}`);
    console.log(` Cursor:   ${CURSOR_BIN}`);
    console.log(`========================================`);
    console.log(` POST /execute  { "task": "指令" }`);
    console.log(` GET  /status`);
    console.log(` GET  /health`);
    console.log(`========================================`);
  });
  return server;
}

// --- Main ---
console.log(`[BRIDGE] Starting... (PID: ${process.pid})`);
startAgent();
const server = startServer();

process.on('SIGINT', () => {
  console.log('\n[BRIDGE] Shutting down...');
  if (taskTimeout) clearTimeout(taskTimeout);
  if (ptyProcess) { try { ptyProcess.write('exit\n'); } catch(_) {} }
  setTimeout(() => { server.close(); process.exit(0); }, 2000);
});
process.on('SIGTERM', () => process.emit('SIGINT'));
