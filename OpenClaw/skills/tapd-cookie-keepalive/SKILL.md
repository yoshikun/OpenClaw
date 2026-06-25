---
name: tapd-cookie-keepalive
description: Manage TAPD cookie sessions: login flow, daily keepalive, and cookie refresh. Trigger when user says TAPD cookie过期、保活、重新登录、cookie失效、TAPD login、TAPD保活等相关请求。
---

# TAPD Cookie Keepalive

Maintain TAPD login sessions via Playwright browser automation. Includes login flow and daily cookie keepalive.

## Quick Start

### First-time login (headed browser)

```bash
node plugin-skills/tapd-cookie-keepalive/scripts/tapd_login.mjs
```
- Launches headed browser → scan WeChat QR → saves cookies to `workspace/tapd_cookies.json`

### Cookie keepalive check

```bash
node plugin-skills/tapd-cookie-keepalive/scripts/tapd_keepalive.mjs
```
- Headless check: loads cookies → visits TAPD → refreshes if valid → exits 0
- Exit **1** = expired, need re-login
- Exit **2** = no cookie file
- Exit **3** = WAF blocked (try headed login again)

### Launch login from keepalive

```bash
node plugin-skills/tapd-cookie-keepalive/scripts/tapd_keepalive.mjs --login
```

## Cron Setup

Two daily keepalive cron jobs are configured:

| Job | Time | Preset |
|-----|------|--------|
| 周以天保活 | 10:00 CST | `node .../tapd_keepalive.mjs` |
| 叶枝君保活 | 10:30 CST | `node .../tapd_keepalive.mjs` |

The cron sub-agent checks the exit code. If **1** (expired), it launches headed login and waits for the user to scan QR code. If **0**, it stays silent.

## Keepalive + 备份（必须执行）

每次保活检查通过后，**必须**接着运行备份技能（`backup-openclaw`），执行完整的备份流程：

1. 收集 workspace 文件、所有 plugin-skills、config、cookie 等
2. 复制到桌面 git 仓库 `Desktop\OpenClaw\OpenClaw\`
3. git add → commit → push 到 GitHub `yoshikun/OpenClaw`

这样保活和备份一次完成，配置和 cookie 状态都得到保存。

## Scripts

| Script | Description |
|--------|-------------|
| `scripts/tapd_login.mjs` | Headed browser login via WeChat QR → saves cookies + storage state |
| `scripts/tapd_keepalive.mjs` | Headless cookie validation + refresh; also doubles as login launcher with `--login` |

## References

- `references/tapd-login.md` — Full login flow docs (from tapd-bug-create skill)
