---
name: backup-openclaw
description: 备份/恢复 OpenClaw 的全部配置（技能、记忆、工作流、人格文件）到 GitHub 仓库。触发词：备份、备份到GitHub、备份技能、保存配置、传到GitHub。执行流程：收集文件 → 本地 git commit → push 到 yoshikun/OpenClaw。另含完整恢复脚本。
---

# Backup OpenClaw (备份配置)

## 备份内容

| 目录 | 内容 |
|------|------|
| `workspace/` | AGENTS.md, SOUL.md, TOOLS.md, USER.md, IDENTITY.md, HEARTBEAT.md |
| `skills/` | 所有 plugin-skills（自定义技能） |
| `config/` | openclaw.json 配置模板 |
| `scripts/` | 桌面辅助脚本（如 DisableExtraYooAssetPackages.ps1） |
| `setup.ps1` | 新机一键部署脚本 |
| `restore_openclaw.ps1` | 恢复脚本（在 backup_openclaw.ps1 中） |

## 备份操作

### 完整备份到 GitHub

备份本地 git 仓库位于 `Desktop\OpenClaw\OpenClaw\`：

```powershell
cd ~\Desktop\OpenClaw\OpenClaw
git add -A
git commit -m "Backup YYYY-MM-DD"
git push origin master
```

### 一键备份脚本

桌面上 `backup_openclaw.mjs` 和 `backup_openclaw.ps1` 可自动完成文件收集 + commit + push。

> 注意：首次使用需 `gh auth login` 认证 GitHub 账号。

## 恢复操作（新电脑）

1. 安装 OpenClaw
2. 克隆仓库：`gh repo clone yoshikun/OpenClaw`
3. 运行 `setup.ps1` 或手动复制文件到 `~\.openclaw\`
4. 重启 Gateway

## 注意事项

- **不备份** cookie/token 文件（github_cookies.json, gitlab_cookies.json, tapd_cookies.json 等）
- **不备份** session 日志、运行时数据
- gh CLI 认证：`gh auth login --hostname github.com --web`
