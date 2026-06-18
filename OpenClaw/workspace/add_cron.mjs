import fs from 'fs';
import crypto from 'crypto';

const cronFile = process.env.USERPROFILE + '/.openclaw/cron/jobs.json';
const data = JSON.parse(fs.readFileSync(cronFile, 'utf8'));

// Generate unique ID
function genId() {
  return 'g:' + crypto.randomUUID();
}

const newJob = {
  id: genId(),
  name: 'OpenClaw Daily Backup',
  description: 'Daily backup of skills, memory, workspace to GitHub',
  enabled: true,
  createdAtMs: Date.now(),
  schedule: {
    kind: 'cron',
    expr: '0 2 * * *',
    tz: 'Asia/Shanghai'
  },
  sessionTarget: 'isolated',
  wakeMode: 'now',
  payload: {
    kind: 'agentTurn',
    message: `Run the daily OpenClaw backup. Execute: powershell -ExecutionPolicy Bypass -File "C:\\Users\\yyzypublic\\.openclaw\\workspace\\OpenClaw\\daily_backup.ps1". Check the output for success/failure. If it reports a commit hash, the backup was successful. If no changes, that's fine too. No need to notify the user unless there's an error.`,
    toolsAllow: ['exec'],
    timeoutSeconds: 120,
    lightContext: true
  },
  state: {}
};

data.jobs.push(newJob);
fs.writeFileSync(cronFile, JSON.stringify(data, null, 2), 'utf8');
console.log('Added cron job: OpenClaw Daily Backup');
console.log('Schedule: 0 2 * * * (Asia/Shanghai) = daily 2:00 AM');
