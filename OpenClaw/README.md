# 🤖 OpenClaw Backup

> Your OpenClaw agent's brain — skills, memory, workflow & config, fully replicable.

## Structure

```
OpenClaw/
├── skills/            # Custom plugin skills
│   ├── update-server/        # DevOps CI/CD server deployment
│   ├── gitlab-permission/    # GitLab project member management
│   ├── memory-keeper/        # Auto save session highlights to memory
│   ├── solo-config-field/    # Add fields to Luban config tables
│   ├── tapd-bug-create/      # Create TAPD bug tickets
│   └── tapd-vsmode-story/    # Create 1V1 VSMODE requirement tickets
├── workspace/         # Core workspace personality files
│   ├── AGENTS.md      # Agent guidelines
│   ├── SOUL.md        # Personality & soul
│   ├── IDENTITY.md    # Identity (fill in your own!)
│   ├── USER.md        # About your human (fill in!)
│   ├── TOOLS.md       # Local setup notes
│   ├── HEARTBEAT.md   # Periodic heartbeat tasks
│   └── MEMORY.md      # Long-term memory (grows over time)
├── memory/            # Daily memory logs
│   └── YYYY-MM-DD.md
├── config/            # Configuration templates (secrets redacted)
│   └── openclaw.json  # Redacted, fill in your own tokens
├── setup.ps1          # One-command setup for new machines
└── README.md          # This file
```

## Quick Setup on a New Machine

### Prerequisites

- OpenClaw installed on the target machine
- Node.js 18+
- A GitHub account (yours)

### Setup Steps

```powershell
# 1. Clone this repo
git clone https://github.com/yoshikun/OpenClaw.git
cd OpenClaw

# 2. Run the setup script (copies everything to the right places)
powershell -ExecutionPolicy Bypass -File setup.ps1

# 3. Fill in your secrets in openclaw.json (API keys, tokens, etc.)
#    located at: ~/.openclaw/openclaw.json

# 4. Register the skills in openclaw.json:
#    "skills": {
#      "load": { "extraDirs": ["~/.openclaw/plugin-skills"] },
#      "entries": {
#        "update-server":      { "enabled": true },
#        "gitlab-permission":  { "enabled": true },
#        "memory-keeper":      { "enabled": true },
#        "solo-config-field":  { "enabled": true },
#        "tapd-bug-create":    { "enabled": true },
#        "tapd-vsmode-story":  { "enabled": true }
#      }
#    }

# 5. Restart the gateway
openclaw gateway restart
```

## Skills Overview

| Skill | What it does |
|-------|-------------|
| **update-server** | Deploy game server updates via DevOps CI/CD pipelines (1v1 project) |
| **gitlab-permission** | Manage GitLab project members (add/remove/search) |
| **memory-keeper** | Auto-save conversation highlights to memory files |
| **solo-config-field** | Add columns to Luban game config tables (Excel) |
| **tapd-bug-create** | Create TAPD bug tickets via Playwright browser automation |
| **tapd-vsmode-story** | Create 1V1 VSMODE requirement tickets on TAPD |

## Notes

- Cookie/auth files (`*_cookies.json`, `*_csrf.json`) are excluded from version control.
- The config template in `config/` has secrets redacted (replace with your own tokens).
- Each new machine needs its own cookie files for DevOps/GitLab/TAPD.
