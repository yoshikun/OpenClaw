<#
.SYNOPSIS
  One-command setup to replicate OpenClaw agent on a new machine.
.DESCRIPTION
  Copies skills, workspace files, memory, and config template
  from the cloned repo to the correct ~/.openclaw/ locations.
#>

$ErrorActionPreference = "Stop"
$RepoDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$OpenClawDir = "$env:USERPROFILE\.openclaw"
$PluginSkillsDir = "$OpenClawDir\plugin-skills"
$WorkspaceDir = "$OpenClawDir\workspace"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OpenClaw Agent Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Create directories if missing
Write-Host "[1/5] Creating directories..." -ForegroundColor Yellow
mkdir $PluginSkillsDir -Force | Out-Null
mkdir "$WorkspaceDir\memory" -Force | Out-Null
Write-Host "  ✓ Done"

# 2. Copy skills
Write-Host "[2/5] Installing skills..." -ForegroundColor Yellow
$skillDirs = Get-ChildItem "$RepoDir\skills" -Directory
foreach ($skill in $skillDirs) {
    $dest = "$PluginSkillsDir\$($skill.Name)"
    if (Test-Path $dest) {
        Write-Host "  ⚠ $($skill.Name) already exists, skipping"
    } else {
        Copy-Item -Recurse $skill.FullName $dest
        Write-Host "  ✓ $($skill.Name)"
    }
}

# 3. Copy workspace files
Write-Host "[3/5] Copying workspace files..." -ForegroundColor Yellow
$workspaceFiles = @("AGENTS.md", "SOUL.md", "IDENTITY.md", "USER.md", "TOOLS.md", "HEARTBEAT.md")
foreach ($f in $workspaceFiles) {
    $src = "$RepoDir\workspace\$f"
    $dest = "$WorkspaceDir\$f"
    if (Test-Path $src) {
        if ((Test-Path $dest) -and $f -in @("AGENTS.md", "SOUL.md", "TOOLS.md", "HEARTBEAT.md")) {
            Write-Host "  ~ $f already exists, kept existing"
        } else {
            Copy-Item $src $dest -Force
            Write-Host "  ✓ $f"
        }
    }
}

# 4. Copy memory if any
Write-Host "[4/5] Copying memory files..." -ForegroundColor Yellow
$memoryFiles = Get-ChildItem "$RepoDir\memory\*.md" -ErrorAction SilentlyContinue
if ($memoryFiles) {
    Copy-Item "$RepoDir\memory\*.md" "$WorkspaceDir\memory\" -Force
    Write-Host "  ✓ $($memoryFiles.Count) file(s)"
} else {
    Write-Host "  - No memory files to copy"
}

# Handle top-level MEMORY.md
if (Test-Path "$RepoDir\memory\MEMORY.md") {
    Copy-Item "$RepoDir\memory\MEMORY.md" "$WorkspaceDir\MEMORY.md" -Force
    Write-Host "  ✓ MEMORY.md"
}

# 5. Config template hint
Write-Host "[5/5] Config setup..." -ForegroundColor Yellow
$configDest = "$OpenClawDir\openclaw.json"
if (Test-Path $configDest) {
    Write-Host "  ~ Config exists, review skills section in $configDest"
    Write-Host "    Add the 'skills.load.extraDirs' and 'skills.entries' as shown in README.md"
} else {
    Write-Host "  ⚠ No config file found. Copy sample from:"
    Write-Host "    Copy-Item '$RepoDir\config\openclaw.json' '$configDest'"
    Write-Host "    Then edit the file and fill in your tokens."
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Restart OpenClaw: openclaw gateway restart"
Write-Host "  2. Check skills are loaded: (ask me '发一下你的技能列表')"
Write-Host "  3. Set up cookies for DevOps/GitLab/TAPD as needed"
