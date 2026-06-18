---
name: cursor-bridge
description: Bridge between OpenClaw and Cursor IDE via MCP (Model Context Protocol) and WebSocket extension. Register OpenClaw as a Cursor MCP server, send instructions to Cursor agent via WebSocket extension, and get results. Trigger when user says "cursor", "给cursor发消息", "让cursor执行", or similar requests about sending tasks to Cursor.
---

# Cursor Agent Bridge

OpenClaw ↔ Cursor 桥接，支持两种方式：

## 方式一：Cursor 扩展（推荐 ⭐）

一键推送，不需要任何手动操作。

### 安装

扩展已安装到 `~/.cursor/extensions/cursor-bridge/`，**重启 Cursor** 后自动激活。

扩展会：
- 在 `ws://127.0.0.1:18792` 启动 WebSocket 服务
- 收到指令后自动打开 Cursor Agent 面板并提交执行

### 使用

```bash
node plugin-skills/cursor-bridge/scripts/instruct_cursor.mjs "你的指令"
```

### 工作方式

```
手机飞书 → OpenClaw → WebSocket → Cursor 扩展 → 自动填入 Agent → 执行
```

## 方式二：MCP（备选）

```bash
# 在 Cursor Agent 中说：
检查一下 openclaw 有什么任务
```

## Scripts

| Script | Description |
|--------|-------------|
| `scripts/instruct_cursor.mjs` | 通过 WebSocket 发送指令到 Cursor（首选） |
| `scripts/mcp_server.mjs` | MCP 协议服务器（备选） |
| `scripts/bridge_server.mjs` | PTY 桥接服务（已废弃） |

## Extension

| File | Description |
|------|-------------|
| `extension/package.json` | Cursor 扩展清单 |
| `extension/extension.js` | WebSocket 服务 + Agent 注入逻辑 |
