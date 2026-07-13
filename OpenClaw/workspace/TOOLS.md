# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

## Session 自动分流规则

收到任务时，按以下规则决定是在主 session 处理还是开子 session：

| 任务类型 | 处理方式 | 说明 |
|---------|---------|------|
| 日常对话、快速查询 | 主 session | 秒级完成，无需分流 |
| **更新测试服**（热更流水线）| `sessions_spawn` 子 session | Unity 构建耗时长，主 session 保持响应 |
| **提 Bug / 需求单**（TAPD）| `sessions_spawn` 子 session | Playwright 跑浏览器，耗时 30s+ |
| 文件读写、代码修改 | 主 session | 快速操作 |
| 需要等待的长任务（>10s）| `sessions_spawn` 子 session | 通用规则 |

**分流原则：**
- 预计 >10 秒的任务 → 子 session（`context: isolated`）
- 子 session 完成后主动通知主人结果
- 主 session 收到任务后立即回复「已开始/正在处理」，不让主人干等

## Skills (My Custom Workflows)

**群聊规范:** 每次在群里收到 @消息时，先立即回复一句礼貌性回应（如"收到""好的""来了"等），再开始处理需求。不要让群里的人等着没反应。

### 更新测试服 (Update Test Server / Client Hotupdate)

**触发指令:** "更新测试服"
> 📝 **注意：** 「更新测试服」默认指**客户端热更**（Unity 打资源包 + 上传CDN）。要更新服务端时主人会特别说明「更新服务端」或「服务端」。不要再走 DevOps 服务端流水线。

**流程:**
1. 检查 Unity 热更流水线是否正在执行（通过进程命令行参数 `RunHotUpdatePipeline` 判断），如果有则提示已有流水线在执行，退出任务
2. 关掉所有已打开的 Unity Editor 进程（kill Unity.exe 进程），避免项目被占用
3. `git pull` 更新 `E:\Solo\nightoffullmoon` 当前分支
4. 运行 Unity 工程 `E:\Solo\nightoffullmoon\client\cardv` 的 BuildPipeline 中的 "热更" 流水线（包含打资源 + 上传CDN）
5. 更新完成后在群里 @兵王(周以天) 通知更新完成

**反馈要求:** 每个步骤执行中状态变化都要通过飞书消息及时反馈，不要让主人干等。

**实现方式:** 主 agent 只做快速操作（检查 + git pull），然后通过 sessions_spawn 创建 sub-agent 去跑 Unity 流水线。主 agent 立即释放。sub-agent 在后台执行并监控日志，完成后自动汇报结果。

**注意：sub-agent 必须通过 bat 文件执行，不要拼内联 PowerShell 命令！** `spawn UNKNOWN` 是 Windows 底层创建进程失败的错误。

**正确写法 (sub-agent 内的 exec 命令):**
```
"E:\Solo\nightoffullmoon\client\cardv\RunBuildPipelineHotUpdate.bat"
```
无需包裹 cmd /c 或 powershell -Command，exec 工具会直接启动 bat。

**快捷命令 (手动执行):**
```
powershell -ExecutionPolicy Bypass -File "E:\Solo\nightoffullmoon\tools\hotupdate-scripts\UpdateTestServer.ps1"
```

**手动执行 (bat):**
`E:\Solo\nightoffullmoon\client\cardv\RunBuildPipelineHotUpdate.bat`

**参数说明:**
- Unity 路径: `C:\Program Files\Unity\Hub\Editor\2020.3.49f1\Editor\Unity.exe`
  - ⚠️ 实际安装目录名是 `2020.3.49f1`（不是 `2020.3.49f1c1`），bat 文件已修正
- 流水线入口: `YYZY.BuildPipeline.BuildPipeline.RunHotUpdatePipeline`
- 流水线名称: "热更"

**注意:**
- 首次使用需在 Unity Editor 中打开 BuildPipeline 窗口配置好 "热更" 流水线的各步骤参数
- 运行需要管理员权限（Unity 许可证校验）
- 完整的日志会输出到 `BuildPipeline_RunHotUpdate.log`
- **默认使用增量构建模式**（不清理 Bundles 缓存），速度更快

### TAPD 提单规则
- **谁让我开单，谁就是处理人。** 除非明确说「给 XX 开单」，不自己猜处理人。

### 群组信息

- **月圆之夜CCG开发群** → `oc_59afc01122ec0cd04ca4d8c5103c7a77`
  - 兵王(周以天) open_id：`ou_348eeddd81d4c03865f9f1684fce6966`
  - 小骑士(谭佳钦) open_id：`ou_fc5144301797fb813a1fee33e1130ac3`

### 飞书消息 @ 人规范

**⚠️ 🔴 铁律：永远不要手动拼 `<at>` 标签！** 2026-07-09 又踩了一次同样的坑 — 手动写的 at 标签转义成了 `\>`。

**唯一正确做法：用 `--mention` 参数让脚本自动处理。** 任何时候需要 @ 人，第一反应就是查这个规范，用脚本方式。不要偷懒手动写！

正确做法：用 `--mention` 参数让脚本自动处理：
```bash
node plugin-skills/feishu-notify/scripts/send_feishu_msg.mjs <chat_id> "消息内容" --mention "open_id,显示名"
```

**关键：`--mention` 后面的整个参数必须用双引号包裹成一个字符串！**
- ❌ 错误：`--mention ou_xxx,兵王(周以天)`（括号被 PowerShell 解析为命令）
- ❌ 错误：消息正文里手动写 `<at>` 标签
- ✅ 正确：`--mention "ou_xxx,兵王(周以天)"`

多个 @ 提及：
```bash
node plugin-skills/feishu-notify/scripts/send_feishu_msg.mjs <chat_id> "消息内容" --mention "open_id1,名字1" "open_id2,名字2"
```

## 备份指令

**触发词：** `备份`、`备份所有东西`、`备份你的记忆`、`保存配置`、`备份到GitHub`

对我说这些词时，我会做以下操作：
1. 收集 OpenClaw 所有配置：
   - workspace 文件（AGENTS.md, SOUL.md, TOOLS.md, USER.md, MEMORY.md 等）
   - 所有 plugin-skills（自定义技能）
   - config/openclaw.json
   - 辅助脚本
2. 复制到桌面 git 仓库 `C:\Users\yyzypublic\Desktop\OpenClaw\OpenClaw\`
3. git add + commit + push 到 GitHub `yoshikun/OpenClaw`

> TAPD 每日保活也会自动做完整的备份流程，详见 tapd-cookie-keepalive 技能。

### 飞书通知 (feishu-notify)

```bash
# 纯文本消息
node plugin-skills/feishu-notify/scripts/send_feishu_msg.mjs <chat_id> "消息内容"

# 带 @ 提及（必须用 --mention，不要手动写 <at> 标签）
node plugin-skills/feishu-notify/scripts/send_feishu_msg.mjs <chat_id> "消息内容" --mention "open_id,显示名"

# 多个 @ 提及
node plugin-skills/feishu-notify/scripts/send_feishu_msg.mjs <chat_id> "消息内容" --mention "open_id1,名字1" "open_id2,名字2"

# ⚠️ 不要这样写（手动拼 <at> 标签容易转义错误）：
# ❌ node script.mjs <chat_id> "消息 <at user_id=\"id\">名字</at>"
```

**重要：必须用 Node.js 脚本，不要用 PowerShell，否则中文会变 ?**

常用群组：
- 月圆之夜CCG开发群: `oc_59afc01122ec0cd04ca4d8c5103c7a77`

常用成员：
- 兵王(周以天): `ou_348eeddd81d4c03865f9f1684fce6966`

## Related

- [Agent workspace](/concepts/agent-workspace)
