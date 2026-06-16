---
name: update-test-package
description: 更新月圆之夜客户端测试包（Unity 热更流水线）。触发词：更新测试包、打测试包、热更、hotupdate、更新客户端、跑热更流水线。使用 Unity 2020.3.49f1c1 执行 BuildPipeline 中的"热更"流水线，包含打资源包 + 上传CDN。适用于月圆之夜项目 E:\Solo\nightoffullmoon。
---

# Update Test Package (热更测试包)

## 流程概览

1. **检查** — 确认无其他 Unity 热更流水线正在运行
2. **关闭 Unity** — Kill 所有 Unity.exe 进程，释放项目占用
3. **Git 更新** — `git pull` E:\Solo\nightoffullmoon 当前分支
4. **执行热更** — 运行 Unity BuildPipeline "热更"流水线
5. **通知** — 完成后在飞书群 @兵王(周以天)

## 执行方式

**主 session** 只做快速操作（检查 + git pull），然后通过 `sessions_spawn` 创建 sub-agent 跑 Unity。主 session 立即释放。

### Sub-agent 的正确写法

Sub-agent 内直接用以下命令执行 bat 文件（不要包裹 cmd /c 或 powershell）：

```bash
"E:\Solo\nightoffullmoon\client\cardv\RunBuildPipelineHotUpdate.bat"
```

### 手动快捷命令

```powershell
powershell -ExecutionPolicy Bypass -File "E:\Solo\nightoffullmoon\tools\hotupdate-scripts\UpdateTestServer.ps1"
```

## 参数

| 项 | 值 |
|---|-----|
| Unity 路径 | `C:\Program Files\Unity\Hub\Editor\2020.3.49f1\Editor\Unity.exe` |
| 流水线入口 | `YYZY.BuildPipeline.BuildPipeline.RunHotUpdatePipeline` |
| 流水线名称 | "热更" |
| 日志文件 | `BuildPipeline_RunHotUpdate.log`（在 cardv 目录下） |

## 注意

- 运行需要 **管理员权限**（Unity 许可证校验）
- 默认 **增量构建**（不清理 Bundles 缓存），速度快。资源异常时才需手动全量
- 首次使用需在 Unity Editor 中打开 BuildPipeline 窗口配置各步骤参数

## 完成通知

成功 → 飞书群 `oc_59afc01122ec0cd04ca4d8c5103c7a77` 发送：
> `热更已完成，测试服已更新 <at user_id="ou_348eeddd81d4c03865f9f1684fce6966">兵王(周以天)</at>`

失败 → 通知查看日志
