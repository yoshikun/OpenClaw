---
name: update-test-package
description: 更新月圆之夜客户端测试包（Unity 热更流水线）。触发词：更新测试包、打测试包、热更、hotupdate、更新客户端、跑热更流水线。使用 Unity 2020.3.49f1c1 执行 BuildPipeline 中的"热更"流水线，包含打资源包 + 上传CDN。适用于月圆之夜项目 E:\Solo\nightoffullmoon。
---

# 热更测试包（Update Test Package）

## 流程概览

1. **检查** — 确认无其他 Unity 热更流水线正在运行
2. **关闭 Unity** — Kill 所有 Unity.exe 进程，释放项目占用
3. **Git 更新** — `git pull` E:\Solo\nightoffullmoon 当前分支
4. **删除旧日志** — 删除 `BuildPipeline_RunHotUpdate.log`，防止 sub-agent 误读旧日志
5. **执行热更** — 通过 sub-agent 运行 Unity BuildPipeline "热更"流水线
6. **通知** — sub-agent 完成后在飞书群 @兵王(周以天) + 告知主人

## 🚨 坑点记录（必须遵守）

### 🔴 坑1：旧日志误导（2026-07-14 踩坑）

**现象：** Unity 进程因冲突等未能实际执行，bat 快速退出（exit code 0），sub-agent 读到旧的 `BuildPipeline_RunHotUpdate.log`，看到上次成功的内容，误以为本次构建成功并发了通知。

**修复：** **在启动 Unity 前必须先删除旧日志文件。** Sub-agent 的第一步就是删日志，再启动 bat。

**验证：** 构建完成后检查日志文件的 LastWriteTime 是否为本次时间（应在 bat 启动之后）。

<details>
<summary>👆 展开查看详细排查过程</summary>

2026-07-14 首次更新测试包时：
1. 主 session 杀了旧的 Unity 进程 (PID 6436)
2. 但残留锁等问题导致新 Unity 进程启动后立即退出，未写任何日志
3. sub-agent 读到 7月9日 的旧日志，看到 `[HotUpdate] 本地测试环境已准备就绪: D:/cdn_solo\update\Android\Test1\1.0.41`
4. sub-agent 误报成功，并在群里发了通知

日志文件的 `LastWriteTime` 还是旧时间，这是一个明确信号。
</details>

### 🔴 坑2：Sub-agent 进程启动方式

**不要用 `cmd /c` 或 `powershell -Command` 包裹 bat 命令！** `spawn UNKNOWN` 是 Windows 底层创建进程失败的错误。

**正确写法：** exec 直接执行 bat 文件路径。

## 执行方式

**主 session** 只做快速操作（检查 + git pull），然后通过 `sessions_spawn` 创建 sub-agent 跑 Unity。主 session 立即释放。

### 主 session 流程（快速操作）

```javascript
// 1. 检查 Unity 流水线是否正在运行
// 2. Kill 所有 Unity.exe 进程
// 3. git pull 更新当前分支
// 4. 确认已 pull 到最新
```

### Sub-agent 的任务模板

Sub-agent 接收以下任务描述：

```
执行月圆之夜客户端热更流水线（Unity 打资源包 + 上传CDN）

步骤：
1. **先删除旧的日志文件**（避免误读旧日志）：
   Remove-Item "E:\Solo\nightoffullmoon\client\cardv\BuildPipeline_RunHotUpdate.log" -Force -ErrorAction SilentlyContinue

2. 启动 Unity 热更流水线（直接 exec bat，不要包裹 cmd /c 或 powershell）：
   "E:\Solo\nightoffullmoon\client\cardv\RunBuildPipelineHotUpdate.bat"

3. 等待并监控日志文件内容

4. 判断结果：查看日志末尾，搜索关键信息

5. 通知：飞书通知开发群 + sessions_send 告知主 session
```

### 手动快捷命令

```powershell
powershell -ExecutionPolicy Bypass -File "E:\Solo\nightoffullmoon\tools\hotupdate-scripts\UpdateTestServer.ps1"
```

手动执行 bat：
```
E:\Solo\nightoffullmoon\client\cardv\RunBuildPipelineHotUpdate.bat
```

## Sub-agent 判断构建结果的规则

在日志中搜索以下关键词来判断：

| 结果 | 关键词 |
|------|--------|
| ✅ 成功 | `Excute Pipline:上传CDN` + 包含完成时间 |
| ✅ 成功 | `本地测试环境已准备就绪` |
| ❌ 失败 | `Exception` / `Error`（排除许可证相关的警告） |
| ❌ 启动失败 | 日志文件不存在或 LastWriteTime 为旧时间 |

**双重验证：** 同时检查日志末尾内容和日志文件 LastWriteTime，确认是本次运行生成的。

## 参数

| 项 | 值 |
|---|-----|
| Unity 路径 | `C:\Program Files\Unity\Hub\Editor\2020.3.49f1\Editor\Unity.exe` |
| ⚠️ 实际安装目录是 `2020.3.49f1`（不是 `2020.3.49f1c1`），bat 文件已修正 |
| 流水线入口 | `YYZY.BuildPipeline.BuildPipeline.RunHotUpdatePipeline` |
| 流水线名称 | "热更" |
| 日志文件 | `BuildPipeline_RunHotUpdate.log`（在 cardv 目录下） |

## 注意

- 运行需要 **管理员权限**（Unity 许可证校验）
- 默认 **增量构建**（不清理 Bundles 缓存），速度快。资源异常时才需手动全量
- 首次使用需在 Unity Editor 中打开 BuildPipeline 窗口配置各步骤参数

## 🔔 完成通知（必须执行）

每次热更完成无论成功还是失败，都**必须**在以下地方通知：

### 飞书开发群
群 `oc_59afc01122ec0cd04ca4d8c5103c7a77`

成功 → 使用脚本发送：
```bash
node plugin-skills/feishu-notify/scripts/send_feishu_msg.mjs oc_59afc01122ec0cd04ca4d8c5103c7a77 "热更已完成，测试包已更新" --mention "ou_348eeddd81d4c03865f9f1684fce6966,兵王(周以天)"
```

失败 → 发送失败原因+日志位置

### 直接告知主人
也通过 sessions_send 告知主 session 结果
