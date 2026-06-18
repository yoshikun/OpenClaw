// Simplified cursor bridge extension
// Pure VS Code API - no http, no net, no external deps
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const TASK_FILE = path.join(
  process.env.USERPROFILE || '',
  '.openclaw', 'workspace', 'cursor_tasks.json'
);

function log(msg) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}\n`;
  try {
    fs.appendFileSync(
      path.join(process.env.USERPROFILE || '', '.openclaw', 'workspace', 'cursor_bridge_debug.log'),
      line
    );
  } catch (_) {}
}

let pollTimer = null;

function activate(context) {
  log('=== ACTIVATED ===');
  log(`Task file: ${TASK_FILE}`);

  // Show status bar
  const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusItem.text = '$(broadcast) Bridge';
  statusItem.tooltip = 'Cursor Bridge - watching for OpenClaw tasks';
  statusItem.command = 'cursor-bridge.check';
  statusItem.show();

  // Register check command
  context.subscriptions.push(
    vscode.commands.registerCommand('cursor-bridge.check', async () => {
      await checkAndExecute();
    })
  );

  // Poll for new tasks every 5 seconds
  let lastTaskId = null;
  pollTimer = setInterval(async () => {
    try {
      if (!fs.existsSync(TASK_FILE)) return;

      const data = JSON.parse(fs.readFileSync(TASK_FILE, 'utf8'));
      if (data.status === 'pending' && data.taskId !== lastTaskId) {
        lastTaskId = data.taskId;
        log(`New task detected: ${data.instruction.substring(0, 80)}...`);
        await executeTask(data);
      }
    } catch (_) {}
  }, 5000);

  log('Bridge started, polling every 5s');
}

async function executeTask(task) {
  log(`Executing task: ${task.instruction.substring(0, 80)}...`);

  try {
    // Step 1: Try to open agent
    const commands = [
      'cursor.composerChatInputFocus',
      'workspace.action.cursorAgent',
      'workbench.action.chat.open',
    ];
    for (const cmd of commands) {
      try {
        await vscode.commands.executeCommand(cmd);
        log(`Opened via: ${cmd}`);
        break;
      } catch (_) {}
    }

    await sleep(1000);

    // Step 2: Set clipboard
    await vscode.env.clipboard.writeText(task.instruction);
    log('Clipboard set');

    await sleep(300);

    // Step 3: Try paste commands
    const pasteCommands = [
      'editor.action.clipboardPasteAction',
    ];
    for (const cmd of pasteCommands) {
      try {
        await vscode.commands.executeCommand(cmd);
        log(`Pasted via: ${cmd}`);
        break;
      } catch (_) {}
    }

    await sleep(300);

    // Step 4: Try send commands
    const sendCommands = [
      'cursor.composerChatSend',
      'workbench.action.chat.send',
    ];
    for (const cmd of sendCommands) {
      try {
        await vscode.commands.executeCommand(cmd);
        log(`Sent via: ${cmd}`);
        break;
      } catch (_) {}
    }

    // Mark completed
    task.status = 'completed';
    task.executedAt = new Date().toISOString();
    fs.writeFileSync(TASK_FILE, JSON.stringify(task, null, 2), 'utf8');
    log('Task completed');

  } catch (err) {
    log(`Error: ${err.message}`);
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function deactivate() {
  if (pollTimer) clearInterval(pollTimer);
  log('Deactivated');
}

module.exports = { activate, deactivate };
