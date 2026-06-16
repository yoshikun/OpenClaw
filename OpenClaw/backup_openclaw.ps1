param (
    [string]$BackupDir = "$env:USERPROFILE\Desktop\OpenClaw_Backup"
)

Write-Host "=== OpenClaw Backup to Desktop ===" -ForegroundColor Cyan

# Clean/create backup directory
if (Test-Path $BackupDir) { Remove-Item $BackupDir -Recurse -Force }
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
Write-Host "Created: $BackupDir"

$OpenClawRoot = "$env:USERPROFILE\.openclaw"

# ======= FUNCTIONS =======
function Copy-FileIfExists($src, $dest) {
    if (Test-Path $src) {
        $d = Split-Path $dest -Parent
        if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
        Copy-Item $src $dest -Force
        Write-Host "  ✓ $((Resolve-Path $src -RelativeBasePath $OpenClawRoot).Path)" -ForegroundColor Green
    } else {
        Write-Host "  - $(([System.IO.Path]::GetRelativePath($OpenClawRoot, $src))) (not found)" -ForegroundColor DarkGray
    }
}

function Copy-DirIfExists($src, $dest) {
    if (Test-Path $src) {
        Copy-Item "$src\*" $dest -Recurse -Force -Exclude @('node_modules','*.log','*.bak','*.rejected.*')
        Write-Host "  ✓ $((Resolve-Path $src -RelativeBasePath $OpenClawRoot).Path)" -ForegroundColor Green
    } else {
        Write-Host "  - $(([System.IO.Path]::GetRelativePath($OpenClawRoot, $src))) (not found)" -ForegroundColor DarkGray
    }
}

# ======= 1. WORKSPACE FILES =======
Write-Host "`n[1/5] Workspace files" -ForegroundColor Yellow
Copy-FileIfExists "$OpenClawRoot\workspace\AGENTS.md" "$BackupDir\workspace\AGENTS.md"
Copy-FileIfExists "$OpenClawRoot\workspace\SOUL.md" "$BackupDir\workspace\SOUL.md"
Copy-FileIfExists "$OpenClawRoot\workspace\USER.md" "$BackupDir\workspace\USER.md"
Copy-FileIfExists "$OpenClawRoot\workspace\IDENTITY.md" "$BackupDir\workspace\IDENTITY.md"
Copy-FileIfExists "$OpenClawRoot\workspace\TOOLS.md" "$BackupDir\workspace\TOOLS.md"
Copy-FileIfExists "$OpenClawRoot\workspace\HEARTBEAT.md" "$BackupDir\workspace\HEARTBEAT.md"
Copy-FileIfExists "$OpenClawRoot\workspace\MEMORY.md" "$BackupDir\workspace\MEMORY.md"
Copy-FileIfExists "$OpenClawRoot\workspace\memory" "$BackupDir\workspace\memory"

# ======= 2. PLUGIN SKILLS =======
Write-Host "`n[2/5] Plugin Skills" -ForegroundColor Yellow
Copy-DirIfExists "$OpenClawRoot\plugin-skills" "$BackupDir\plugin-skills"

# ======= 3. AGENT CONFIG =======
Write-Host "`n[3/5] Agent Config" -ForegroundColor Yellow
Copy-DirIfExists "$OpenClawRoot\agents" "$BackupDir\agents"

# ======= 4. OPENCLAW CONFIG =======
Write-Host "`n[4/5] OpenClaw Config" -ForegroundColor Yellow
Copy-FileIfExists "$OpenClawRoot\openclaw.json" "$BackupDir\openclaw.json"

# ======= 5. CREATE SETUP SCRIPT =======
Write-Host "`n[5/5] Restore Script" -ForegroundColor Yellow
@"
# restore_openclaw.ps1 - Restore OpenClaw backup to a new machine
param (
    [string]`$BackupDir = "`$PSScriptRoot"
)

`$OpenClawRoot = "`$env:USERPROFILE\.openclaw"

Write-Host "=== Restoring OpenClaw..." -ForegroundColor Cyan

# Restore workspace
if (Test-Path "`$BackupDir\workspace") {
    Copy-Item "`$BackupDir\workspace\*" "`$OpenClawRoot\workspace\" -Recurse -Force
    Write-Host "  ✓ Workspace restored" -ForegroundColor Green
}

# Restore plugin-skills
if (Test-Path "`$BackupDir\plugin-skills") {
    Copy-Item "`$BackupDir\plugin-skills\*" "`$OpenClawRoot\plugin-skills\" -Recurse -Force
    Write-Host "  ✓ Plugin skills restored" -ForegroundColor Green
}

# Restore agents
if (Test-Path "`$BackupDir\agents") {
    Copy-Item "`$BackupDir\agents\*" "`$OpenClawRoot\agents\" -Recurse -Force
    Write-Host "  ✓ Agent config restored" -ForegroundColor Green
}

# Restore openclaw.json
if (Test-Path "`$BackupDir\openclaw.json") {
    Copy-Item "`$BackupDir\openclaw.json" "`$OpenClawRoot\openclaw.json" -Force
    Write-Host "  ✓ Config restored" -ForegroundColor Green
}

# Restart Gateway
Write-Host "`nRestarting OpenClaw Gateway..." -ForegroundColor Yellow
`$wshell = New-Object -ComObject WScript.Shell
`$wshell.Run('openclaw gateway restart', 0, $false)

Write-Host "`n=== Restore complete! ===" -ForegroundColor Cyan
"@ | Out-File -FilePath "$BackupDir\restore_openclaw.ps1" -Encoding utf8

Write-Host "  ✓ restore_openclaw.ps1" -ForegroundColor Green

# ======= SUMMARY =======
Write-Host "`n" ("=" * 50) -ForegroundColor Cyan
Write-Host "Backup complete!" -ForegroundColor Green
Write-Host "Location: $BackupDir" -ForegroundColor White
Write-Host "`nTo restore on another PC:" -ForegroundColor Yellow
Write-Host "  1. Install OpenClaw" -ForegroundColor Gray
Write-Host "  2. Copy the backup folder to the new PC" -ForegroundColor Gray
Write-Host "  3. Run: .\restore_openclaw.ps1" -ForegroundColor Gray
Write-Host "`nTo push to GitHub:" -ForegroundColor Yellow
Write-Host "  cd $BackupDir" -ForegroundColor Gray
Write-Host "  git init" -ForegroundColor Gray
Write-Host "  git add ." -ForegroundColor Gray
Write-Host "  git commit -m 'OpenClaw backup'" -ForegroundColor Gray
Write-Host "  git remote add origin https://github.com/yoshikun/OpenClaw.git" -ForegroundColor Gray
Write-Host "  gh auth login  # or use your own GitHub auth" -ForegroundColor Gray
Write-Host "  git push -f origin master" -ForegroundColor Gray
