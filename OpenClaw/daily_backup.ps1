<#
.SYNOPSIS
  Daily backup script: sync workspace changes to the OpenClaw repo and push to GitHub.
  Called automatically by OpenClaw cron job.
#>

$ErrorActionPreference = "Stop"
$RepoDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceDir = "$env:USERPROFILE\.openclaw\workspace"
$PluginSkillsDir = "$env:USERPROFILE\.openclaw\plugin-skills"
$DateStr = Get-Date -Format "yyyy-MM-dd HH:mm"

Write-Host "=== Daily Backup: $DateStr ===" -ForegroundColor Cyan

# Check if we have a repo
if (-not (Test-Path "$RepoDir\.git")) {
    Write-Host "ERROR: No git repo found at $RepoDir" -ForegroundColor Red
    exit 1
}

# 1. Sync workspace files
Write-Host "[1/4] Syncing workspace files..." -ForegroundColor Yellow
$workspaceFiles = @("AGENTS.md", "SOUL.md", "IDENTITY.md", "USER.md", "TOOLS.md", "HEARTBEAT.md", "MEMORY.md")
$changed = $false
foreach ($f in $workspaceFiles) {
    $src = "$WorkspaceDir\$f"
    $dst = "$RepoDir\workspace\$f"
    if (Test-Path $src) {
        Copy-Item $src $dst -Force
        $changed = $true
    }
}

# 2. Sync memory files
Write-Host "[2/4] Syncing memory files..." -ForegroundColor Yellow
if (Test-Path "$WorkspaceDir\memory") {
    $memoryFiles = Get-ChildItem "$WorkspaceDir\memory\*.md" -ErrorAction SilentlyContinue
    if ($memoryFiles) {
        robocopy "$WorkspaceDir\memory" "$RepoDir\memory" *.md /NFL /NDL /NJH /NJS /NP > $null
        $changed = $true
    }
}

# 3. Sync skills (SKILL.md only, not scripts which rarely change)
Write-Host "[3/4] Syncing skill files..." -ForegroundColor Yellow
$skillDirs = Get-ChildItem "$PluginSkillsDir" -Directory -ErrorAction SilentlyContinue
foreach ($skill in $skillDirs) {
    $skillName = $skill.Name
    $srcSkill = "$PluginSkillsDir\$skillName\SKILL.md"
    $dstSkill = "$RepoDir\skills\$skillName\SKILL.md"
    if (Test-Path $srcSkill) {
        # Create dest dir if needed
        $null = New-Item -ItemType Directory -Force -Path "$RepoDir\skills\$skillName"
        Copy-Item $srcSkill $dstSkill -Force
    }
}

# 4. Commit and push
Write-Host "[4/4] Committing and pushing..." -ForegroundColor Yellow
cd $RepoDir

# Check for changes
$status = git status --porcelain 2>&1
if ($status) {
    git add -A 2>&1 | Out-Null
    git commit -m "daily backup: $DateStr" 2>&1 | Out-Null
    
    # Push (using stored credential helper)
    git push 2>&1 | Out-Null
    
    # Get the commit hash
    $commitHash = git rev-parse --short HEAD 2>&1
    Write-Host "  ✓ Pushed commit $commitHash" -ForegroundColor Green
    return "Backup successful: commit $commitHash"
} else {
    Write-Host "  - No changes to backup" -ForegroundColor Gray
    return "No changes to backup"
}
