---
name: memory-keeper
description: Automatically save session highlights, decisions, and new learnings to memory and skill files after conversations. Activate at conversation end or when new information is exchanged.
---

# Memory Keeper（记忆管家）

在每次对话结束后自动保存重要信息到技能和记忆文件中，让我越来越好用。

## 核心原则

- **有信息才记：** 闲聊天不记，只有出现新的配置、习惯、决策、工单、Bug 时才记录
- **就近归位：** 新信息记到对应文件里（不是都塞 MEMORY.md 一个文件里）
- **覆盖归入：** 如果新规则完全替代了旧规则，直接在原文件里替换，不加追加

## 记录逻辑

### 1. 对话结束时，提取新信息

```
新信息 = 减去(A， B， C)
  A = 当前对话的内容
  B = 我已经知道的（MEMORY.md + TOOLS.md + 对应 skill）
  C = 无关信息（闲聊、问候、等待通知）
```

### 2. 分类归档到正确位置

| 信息类型 | 记到哪 |
|---------|--------|
| 配置/API/路径/工具 | `TOOLS.md` |
| 长期习惯、决策、项目相关 | `MEMORY.md` |
| 今日流水账 | `memory/YYYY-MM-DD.md` |
| 技能相关（流程/参数/触发词）| 对应 `plugin-skills/<skill>/SKILL.md` |
| 同事权限规则 | `COLLEAGUE_WHITELIST.md` |
| 系统配置（代理/心跳/保活）| `HEARTBEAT.md` |

### 3. 什么时候触发

| 触发时机 | 行为 |
|---------|------|
| 对话结束时出现了5条以上信息交换 | 自动评估是否需要记录 |
| 主人明确说「更新/保存技能和记忆」| 强制执行 |
| 新 Skill 被创建或修改 | 记录到 MEMORY.md |
| 新工具/配置/路径被引入 | 记录到 TOOLS.md |
| 决策/约定/习惯被建立 | 记录到 MEMORY.md |

### 4. 记录格式

**MEMORY.md — 精炼关键点：**

```markdown
## 标题（YYYY-MM-DD）

简要描述。如果多段就用节，保持每段短，不啰嗦。
```

**memory/YYYY-MM-DD.md — 当日流水：**
- 按时间倒叙或按主题归类
- 记录做了什么、学到了什么、踩了什么坑
- 不记录敏感信息（token、密码）

## 注意

- 不要重复记录已经存在的信息
- 旧信息被完全替代时直接覆盖原内容（用 edit 替换 block），不加追加
- 保持 MEMORY.md 简洁，详细的流水在每日文件里
- 如果每天记了一大堆，隔几天清理精简一次 MEMORY.md
