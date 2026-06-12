---
name: update-server
description: Update game servers via DevOps CI/CD pipelines. Use when user says "更新qa服" / "更新qa服务器" / "更新1v1_qa服" / "更新测试服务器" or similar server update requests (服务端 updates only, not client hotupdate).
---

# 更新服务器（服务端 DevOps）

通过 DevOps 流水线更新游戏服务器（服务端）。

**⚠️ 这是服务端更新，区别于客户端的「更新测试服」热更。如果需求方语意不明确，先确认是客户端还是服务端。**

## 项目映射

不同游戏项目对应不同的 DevOps 分组：

| 项目 | 分组 | 流水线 | 备注 |
|-----|------|-------|------|
| **1v1** | `1v1` | 1v1-测试服 | 默认，所有「更新qa服」等无明确项目指向时使用 |
| 其他 | — | — | 未配置 |

**默认行为：** 如果用户没指定项目（只说「更新qa服务器」），默认走 1v1 项目。

## 1v1 项目（默认）

### Pipeline 详情

| 项目 | 内容 |
|------|------|
| 流水线名 | 1v1-测试服 |
| DevOps 分组 | 1v1 |
| Pipeline ID | `p-f78c977835c84b71a6d58b4746cd1c4a` |
| URL | https://devops.devcloud.ztgame.com/projects/yyzy/pipelines/p-f78c977835c84b71a6d58b4746cd1c4a |

### 构建步骤

1. **打配置** — 拉配置分支 → Luban 编译 Excel 配表 → 输出到部署目录
2. **build+替换** — 拉代码分支 → 编译 .NET 服务 → 复制 `.dll` 到部署目录
3. **重启服务** — `stop.py` 停服务 → `run.py` 启动微服务

### dest 可选值（流水线里的服务器名）

| 值 | 中文名 |
|----|------|
| `1v1_test` | 自测服 |
| `1v1_dev` | 开发服 |
| `1v1_zhuanxiang` | 专项服 |
| `1v1_qa` | QA测试服 |
| `1v1_cehua1` | 策划服1 |
| `1v1_cehua2` | 策划服2 |

### 启动变量

| 变量名 | 默认值 | 说明 |
|-------|--------|------|
| `dest` | `1v1_qa` | **目标部署目录（关键参数）** |
| `code_branch` | 默认分支 | 代码分支 |
| `battle_branch` | 默认分支 | 战斗模块分支 |
| `config_branch` | 默认分支 | 配置分支 |
| `manzo_branch` | `main` | manzo 分支 |

### 用户指令映射

| 用户说 | 目标 dest |
|--------|-----------|
| 「更新qa服」/「更新qa服务器」/「更新1v1_qa服」 | `1v1_qa` |
| 「更新自测服」/「更新1v1_test服」 | `1v1_test` |
| 「更新开发服」/「更新1v1_dev服」 | `1v1_dev` |
| 「更新专项服」/「更新1v1_zhuanxiang服」 | `1v1_zhuanxiang` |
| 「更新策划服」/「更新1v1_cehua2服」 | `1v1_cehua2` |
| 「更新策划1服」/「更新1v1_cehua1服」 | `1v1_cehua1` |

## Prerequisites

- **DevOps Cookie:** `workspace/devops_cookies.json`（需提前扫码登录保存）
- **Playwright:** 已安装

## 操作步骤

1. **读取 Cookie**：从 `workspace/devops_cookies.json` 加载
2. **访问流水线**：根据项目找到对应的 Pipeline URL
3. **点击「启动新构建」**
4. **设置 dest 参数**：根据用户指令映射到对应的 dest 值
5. **提交触发**并确认构建进入运行中状态
6. **汇报结果**：返回构建编号和状态

## Cookie 保活

DevOps cookie 会自动保活（每天一次），无需手动重新登录。

## 反馈与通知

- **反馈用流水线里的 dest 值**：如说「更新qa服」→反馈「开始更新1v1_qa服」
- **完成后通知指派人**（谁叫我干活的就通知谁）
- **不发群消息**

## 注意事项

- **这是更新服务端的流水线**（不是客户端热更）
- 触发后构建大约需要 **2 分钟**完成
- 如果 cookies 失效，需要带 `headless: false` 重新扫码登录
- Pipeline 页面不支持修改配置（只读权限）
- **语意不明时问一句：是客户端还是服务端？**
