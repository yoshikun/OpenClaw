/**
 * Cursor Agent Direct Bridge
 * 
 * Sends instructions directly to the running Cursor Agent window
 * by pasting text and triggering execution.
 * 
 * Usage: node cursor_bridge.mjs "your instruction"
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const instruction = process.argv.slice(2).join(' ').trim();
if (!instruction) {
  console.error('Usage: node cursor_bridge.mjs <instruction>');
  process.exit(1);
}

// Write instruction to a temp file that the PowerShell script will read
const tempFile = path.join(process.env.TEMP || 'C:\\Temp', 'cursor_instruction.txt');
fs.writeFileSync(tempFile, instruction, 'utf8');

// Also save as pending task (for MCP fallback)
const wsDir = path.resolve('C:\\Users\\yyzypublic\\.openclaw\\workspace');
const taskFile = path.join(wsDir, 'cursor_tasks.json');
fs.writeFileSync(taskFile, JSON.stringify({
  taskId: Date.now().toString(36),
  timestamp: new Date().toISOString(),
  timeLabel: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
  from: '叶枝君 (手机飞书)',
  instruction,
  status: 'pending',
}, null, 2), 'utf8');

// Execute PowerShell script to send keystrokes to Cursor Agent window
const psScript = `
Add-Type -AssemblyName System.Windows.Forms

# Find the Cursor Agents window
$sig = @'
[DllImport("user32.dll")]
public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
[DllImport("user32.dll")]
public static extern bool SetForegroundWindow(IntPtr hWnd);
[DllImport("user32.dll")]
public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
[DllImport("user32.dll")]
public static extern int GetWindowTextLength(IntPtr hWnd);
[DllImport("user32.dll", CharSet = CharSet.Auto)]
public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);
[DllImport("user32.dll")]
public static extern IntPtr GetWindow(IntPtr hWnd, int uCmd);
[DllImport("user32.dll")]
public static extern IntPtr GetDesktopWindow();
'@
$user32 = Add-Type -MemberDefinition $sig -Name "User32Find" -Namespace Win32 -PassThru

# Find the agent window by title
$hwnd = $user32::FindWindow($null, "Cursor Agents")
if ($hwnd -eq [IntPtr]::Zero) {
  # Try broader search
  $desktop = $user32::GetDesktopWindow()
  $child = $user32::GetWindow($desktop, 5)
  while ($child -ne [IntPtr]::Zero) {
    $len = $user32::GetWindowTextLength($child)
    if ($len -gt 0) {
      $sb = New-Object System.Text.StringBuilder ($len + 1)
      $user32::GetWindowText($child, $sb, $len + 1)
      $title = $sb.ToString()
      if ($title -match "Cursor|agent|Agent") {
        $hwnd = $child
        Write-Output "Found window: $title (HWND: $($child.ToString('X')))"
        break
      }
    }
    $child = $user32::GetWindow($child, 2)
  }
}

if ($hwnd -eq [IntPtr]::Zero) {
  Write-Output "ERROR: Cursor agent window not found"
  exit 1
}

Write-Output "Found Cursor window"

# Read instruction from temp file
$instruction = Get-Content -Path '${tempFile.replace(/\\/g, '\\\\')}' -Raw

# Set clipboard
[System.Windows.Forms.Clipboard]::SetText($instruction)
Write-Output "Clipboard set: $($instruction.Substring(0, [Math]::Min(80, $instruction.Length)))..."

# Bring window to foreground
$user32::ShowWindow($hwnd, 5) | Out-Null  # SW_SHOW
$user32::SetForegroundWindow($hwnd) | Out-Null
Start-Sleep -Milliseconds 500

# Use SendKeys to paste (Ctrl+V) and execute (Enter)
[System.Windows.Forms.SendKeys]::SendWait("^v")
Start-Sleep -Milliseconds 300
[System.Windows.Forms.SendKeys]::SendWait("~")
Write-Output "Instruction sent to Cursor Agent"
`;

const psFile = path.join(process.env.TEMP || 'C:\\Temp', 'send_to_cursor.ps1');
fs.writeFileSync(psFile, psScript, 'utf8');

// Run PowerShell
const result = spawn('powershell.exe', [
  '-NoProfile',
  '-ExecutionPolicy', 'Bypass',
  '-File', psFile,
], {
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});

let output = '';
result.stdout.on('data', d => { output += d.toString(); });
result.stderr.on('data', d => { output += d.toString(); });

result.on('close', (code) => {
  console.log(output);
  if (code === 0) {
    console.log('\\n[OK] Instruction sent to Cursor Agent');
  } else {
    console.log(`\\n[FAIL] Exit code: ${code}`);
  }
  // Cleanup
  try { fs.unlinkSync(psFile); } catch(_) {}
  process.exit(code);
});
