# 🤖 OpenClaw Backup

> Your OpenClaw agent's brain — skills, memory, workflow & config, fully replicable.
> Clone this repo on any new machine, run one script, and your agent is back.

## 📦 What's Backed Up

| 目录 | 内容 |
|------|------|
| `skills/` | 6 个自定义技能 — DevOps 部署、GitLab 权限、记忆管理、配表编辑、TAPD 提单 |
| `workspace/` | 核心人格文件 — AGENTS.md, SOUL.md, TOOLS.md, HEARTBEAT.md 等 |
| `memory/` | 长期记忆和每日日志 |
| `config/` | OpenClaw 配置模板（敏感信息已脱敏） |
| `setup.ps1` | 一键部署脚本 |

## 📁 Structure

```
OpenClaw/
├── skills/                    # Custom plugin skills
│   ├── update-server/         # DevOps CI/CD server deployment
│   │   └── SKILL.md           # Pipeline config, dest mapping, build steps
│   ├── gitlab-permission/     # GitLab project member management
│   │   ├── SKILL.md
│   │   └── scripts/git_permission.mjs
│   ├── memory-keeper/         # Auto save session highlights to memory files
│   │   └── SKILL.md
│   ├── solo-config-field/     # Add columns to Luban game config tables (Excel)
│   │   ├── SKILL.md
│   │   ├── scripts/add_field.mjs
│   │   ├── package.json
│   │   └── package-lock.json
│   ├── tapd-bug-create/       # Create TAPD bug tickets via Playwright
│   │   ├── SKILL.md
│   │   ├── scripts/create_bug.mjs
│   │   ├── scripts/create_story.mjs
│   │   └── references/
│   └── tapd-vsmode-story/     # Create 1V1 VSMODE requirement tickets on TAPD
│       └── SKILL.md
├── workspace/                 # Agent personality & config files
│   ├── AGENTS.md              # Agent guidelines & memory rules
│   ├── SOUL.md                # Personality & soul
│   ├── IDENTITY.md            # Identity (fill in your own!)
│   ├── USER.md                # About your human (fill in!)
│   ├── TOOLS.md               # Local setup notes
│   ├── HEARTBEAT.md           # Periodic heartbeat tasks
│   └── MEMORY.md              # Long-term memory (grows over time)
├── memory/                    # Daily memory logs
│   └── YYYY-MM-DD.md
├── config/                    # Configuration templates (secrets redacted)
│   └── openclaw.json          # Redacted, fill in your own tokens
├── setup.ps1                  # One-command setup for new machines
└── README.md                  # This file
```

## 🚀 Setup (New Machine)

### Prerequisites

- **OpenClaw** installed on the target machine
- **Node.js** 18+
- **Git**
- A **GitHub Personal Access Token** (classic, with `repo` scope)

### One-Command Setup

```powershell
# 1. Clone
git clone https://github.com/yoshikun/OpenClaw.git
cd OpenClaw

# 2. Run setup (copies skills, workspace, memory to ~/.openclaw)
powershell -ExecutionPolicy Bypass -File setup.ps1

# 3. Configure openclaw.json
#    Edit: ~/.openclaw/openclaw.json
#    Add skills section:

```

### Skills Registration

Add this to the `skills` section of `~/.openclaw/openclaw.json`:

```jsonc
{
  "skills": {
    "allowBundled": [
      "skill-creator",
      "taskflow",
      "taskflow-inbox-triage"
    ],
    "load": {
      "extraDirs": ["~/.openclaw/plugin-skills"],
      "watch": true
    },
    "entries": {
      "update-server":      { "enabled": true },
      "gitlab-permission":  { "enabled": true },
      "memory-keeper":      { "enabled": true },
      "solo-config-field":  { "enabled": true },
      "tapd-bug-create":    { "enabled": true },
      "tapd-vsmode-story":  { "enabled": true }
    }
  }
}
```

### Restart

```powershell
# 4. Restart gateway to load new skills
openclaw gateway restart

# 5. Verify — ask your agent:
#    "发一下你的技能列表"
```

## 🛠️ Skills Overview

### update-server (服务端部署)
- DevOps CI/CD pipeline for game server deployment
- **Project:** 1v1 (`dest` values: 1v1_test, 1v1_dev, 1v1_qa, 1v1_zhuanxiang, 1v1_cehua1, 1v1_cehua2)
- **Prerequisite:** `workspace/devops_cookies.json`
- **Pipeline:** https://devops.devcloud.ztgame.com/projects/yyzy/pipelines/p-f78c977835c84b71a6d58b4746cd1c4a

### gitlab-permission (GitLab 权限管理)
- Add/remove/search members on git.devcloud.ztgame.com
- **Managed repos:** yyzy_proj/1v1/config, yyzy_proj/gordian/gameconfig, etc.
- **Prerequisite:** `workspace/gitlab_cookies.json` + CSRF token

### memory-keeper (记忆管家)
- Automatically saves conversation highlights, decisions, and new learnings
- Archives to MEMORY.md, daily files, and skill files
- Triggered by information exchange or explicit "更新技能和记忆" command

### solo-config-field (配表加字段)
- Add columns to Luban config tables (Excel-based game config)
- Supports KV tables (Common.xlsx) and list tables (Card.xlsx, Buff.xlsx, etc.)
- **Requires:** SoloConfig submodule at `E:\Solo\nightoffullmoon\client\config\SoloConfig\`

### tapd-bug-create (TAPD 提单)
- Create bug tickets on TAPD (腾讯敏捷产品研发平台)
- **Workspace:** 31253609 (月圆之夜)
- Supports screenshots, auto-complete handlers, default assignment rules
- **Prerequisite:** `workspace/tapd_cookies.json` + Playwright

### tapd-vsmode-story (TAPD 需求单)
- Create 1V1 VSMODE requirement tickets with preset sub-items
- 6 templates: client / server / design / ui / motion / audio
- **Prerequisite:** `workspace/tapd_cookies_yezhijun.json` + Playwright

## ⚠️ Important Notes

- **Secrets are excluded!** Cookie files (`*_cookies.json`), CSRF tokens, and session cookies are in `.gitignore` and never committed.
- **Config template has secrets redacted** (`***redacted***`). Fill in your own tokens on the new machine.
- **Each new machine needs its own cookies.** DevOps, GitLab, and TAPD all require browser-based SSO login.
- **MEMORY.md and daily logs grow over time** — they're backed up here, so commit and push regularly to keep them synced.

## 🔄 Keeping in Sync

```powershell
cd OpenClaw

# Backup latest changes from this machine
# (copy updated workspace/memory files to the repo)
xcopy /E /Y "$env:USERPROFILE\.openclaw\workspace\*.md" "workspace\"
xcopy /E /Y "$env:USERPROFILE\.openclaw\workspace\memory\*.md" "memory\"

# Commit and push
git add .
git commit -m "sync: update memory and workspace"
git push
```

---

*Made by [yoshikun](https://github.com/yoshikun) — because your agent should remember who it is, even on a new machine.*
