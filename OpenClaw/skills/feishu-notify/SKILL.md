---
name: feishu-notify
description: 通过飞书 Open API 向飞书群聊发送文本通知消息。支持 @ 提及成员。触发词：通知群、发消息到飞书群、在群里说一声。适用于热更完成通知、服务端更新通知、任何需要 agent 主动发消息到飞书群聊的场景。
---

# Feishu Notify

向飞书群聊发送文本消息，支持 UTF-8 中文和 @ 提及。

## 脚本

`scripts/send_feishu_msg.mjs` — 使用 Node.js https 模块直接调用飞书 API，原生 UTF-8，无编码问题。

## 使用方式

```bash
# 纯文本消息
node plugin-skills/feishu-notify/scripts/send_feishu_msg.mjs <chat_id> "消息内容"

# 带 @ 提及（--mention 参数自动拼接 <at> 标签）
node plugin-skills/feishu-notify/scripts/send_feishu_msg.mjs <chat_id> "消息内容" --mention open_id,显示名

# 多个 @ 提及
node plugin-skills/feishu-notify/scripts/send_feishu_msg.mjs <chat_id> "消息内容" --mention open_id1,名字1 open_id2,名字2

# 也可以在文本里直接写 <at> 标签（注意转义引号）
node plugin-skills/feishu-notify/scripts/send_feishu_msg.mjs <chat_id> "消息 <at user_id=\"open_id\">名字</at>"
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `FEISHU_APP_ID` | 飞书应用 App ID | `cli_a9458ff380b99ccb` |
| `FEISHU_APP_SECRET` | 飞书应用 App Secret | `Qs3NVpgH7h4UP7cVPfZRHh72E3jEOGKv` |

## 重要：编码注意事项

- **必须使用 Node.js 脚本，不要用 PowerShell 的 Invoke-RestMethod** — PowerShell 的 `ConvertTo-Json` 在嵌套 JSON 时会把中文转为 `\uXXXX` 或 `?`，导致乱码
- Node.js 的 `JSON.stringify` + `https` 模块原生支持 UTF-8，中文正常
- 如果必须用 shell 调用，确保 `Content-Type: application/json; charset=utf-8` 且 body 是 UTF-8 编码的字节流

## 常用群组

| 群名 | Chat ID |
|------|---------|
| 月圆之夜CCG开发群 | `oc_59afc01122ec0cd04ca4d8c5103c7a77` |

## 常用成员

| 姓名 | Open ID |
|------|---------|
| 兵王(周以天) | `ou_348eeddd81d4c03865f9f1684fce6966` |
| 小骑士(谭佳钦) | `ou_fc5144301797fb813a1fee33e1130ac3` |
