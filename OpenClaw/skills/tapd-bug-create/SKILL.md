---
name: tapd-bug-create
description: Create bug tickets on TAPD (腾讯敏捷产品研发平台) for the 月圆之夜 project via Playwright browser automation. 
  Use when user says: create a bug, file a bug, report a bug, 提单, 提bug, 创建缺陷, create a story/requirement.
  Also handles TAPD login, cookie management, and default assignment rules.
---

# TAPD 提 Bug（TAPD Bug & Story Create）

Automate creating work items on TAPD for workspace `31253609` (月圆之夜).

## Prerequisites

- **Cookies** in `workspace/tapd_cookies.json` (owner: 枝君, workspace 31253609 accessible)
- **Playwright** v1.60.0+
- **WAF Bypass**: Use provided stealth init script; fallback to `headless: false` if blocked

## Quick Start - Create a Bug (v5)

```javascript
import { createBug } from './scripts/create_bug.mjs';
const url = await createBug({
  title: 'Bug title',
  handler: '谭佳钦',       // 姓名，触发自动补全 (不要带分号)
  cc: '周以天;',           // 直接填`姓名;`格式
  priority: 'P2',
  version: '【1V1】正式版本V2.0',
  module: '1V1',
  branch: 'YZY_1V1 V1.0 Beta',
  description: 'Description',
  attachments: ['path/to/img1.jpg', 'path/to/img2.png'],  // 可选: 截图附件
});
// Returns: https://www.tapd.cn/31253609/bugtrace/bugs/detail/{id}
```

### v5 改进说明

| 问题 | 修复方式 |
|------|----------|
| 🔴 重复提单 | ✅ 前置去重检查: 30 分钟内相同标题禁止重复提交; 提单成功后写入 `tapd_bug_dedup.json` 缓存 |
| 🔴 处理人不正确 | ✅ `autoCompleteUser()` 增强: 精确匹配搜索词 + 提交前校验 `#BugCurrentOwner` 隐藏字段值, 不匹配则抛异常阻止提交 |
| 🟡 提交后无法确定是否成功 | ✅ 主动轮询 URL (每 1s, 最长 20s) 检查跳转或成功提示, 不依赖 waitForNavigation |
| 🟡 一次操作提交多次 | ✅ 只使用 `#_view` 单个提交按钮, 移除 fallback 到 `#submit_and_continue` |
| 🟡 空字段提单 | ✅ 提交前校验 title/handler 非空 |

### Required Fields (must fill)

| Field | ID | Common Value |
|-------|-----|--------|
| 标题 | `#BugTitle` | Bug 简述 |
| 发现版本 | `#BugVersionReport` | `【1V1】正式版本V4.0` |
| 处理人 | `#BugCurrentOwnerValue` | 输入姓名触发自动补全 |
| 优先级 | `#BugPriority` | `P2` |
| 研发分支 | `#BugCustomFieldOne` | `YZY_1V1 V1.0 Beta` |
| 模块 | `#BugModule` | `1V1` |

### Submit Button

Click **`#_view`** (visible `<a>` with text "创建") to submit.
The `#save_view` hidden input is the fallback if `#_view` not found.
**Do NOT** click `#submit_and_continue` — it creates a second bug.

### Upload Attachments (Images)

TAPD uses `#file_input` (`<input type="file">`) for file upload.
Playwright's `setInputFiles()` works even on hidden inputs:

```javascript
// 附件上传正确流程（创建页和编辑页通用）：
// 1. 先点击上传触发按钮
await page.locator('#upload-attachement').first().click();
await page.waitForTimeout(1000);

// 2. 上传文件（#file_input 有多个，用 .first()）
await page.locator('#file_input').first().setInputFiles('path/to/screenshot.jpg');

// 3. 等待 3s（AJAX 上传到 file.tapd.cn 需要时间）
await page.waitForTimeout(3000);

// 4. 多文件依次上传
for (const filePath of attachmentPaths) {
  await page.locator('#file_input').first().setInputFiles(filePath);
  await page.waitForTimeout(3000);
}
```

**关键：** 不点击 `#upload-attachement` 就直接 setInputFiles 会导致上传失败（文件内容为空）。必须先点击触发按钮再上传。

When the user sends images/messages with player feedback screenshots:
1. Save the attachments from `media/inbound/`
2. Pass as `attachments: [filePath1, filePath2]` to the create bug script
3. Required: always include user-provided screenshots as bug evidence

## Default Assignment Rules

| Bug 类型 | 处理人 | 抄送人 |
|----------|--------|--------|
| 程序 (Code) | `叶枝君;` | `周以天;` |
| 策划 (Design) | `赵乾;` | `周以天;` |
| UI | `小冰;` | `周以天;` |
| 特效 (Effect) | `肖和;` | `周以天;` |

**所有 bug 单抄送人默认加兵王（周以天）**

## Set Handler/CC - Autocomplete (IMPORTANT)

The handler and CC fields use TAPD's user autocomplete. **Do NOT set hidden fields directly** (will show as ID).

**v5 改进：** 自动补全逻辑已封装为 `autoCompleteUser()` 函数，不再需要手动 type/wait/Enter。
- 逐字输入触发补全（delay 80ms）
- 等待 `.tt-dropdown-menu` 出现（最多 4s）
- 精确匹配姓名（多个建议时选包含搜索词的那个）
- 提交前验证 `#BugCurrentOwner` 隐藏字段非空，否则抛异常阻止提交

```javascript
// 处理人（自动补全已封装）
const ownerInput = page.locator('#BugCurrentOwnerValue').first();
await autoCompleteUser(page, ownerInput, '叶枝君', '处理人');

// 校验结果：如果自动补全失败会抛异常，不会提交空字段
```

**注意：** `#BugCurrentOwnerValue` 和 `#BugCcValue` 页面上可能有多个，必须用 `.first()`

## Create a Story (Requirement)

```javascript
import { createStory } from './scripts/create_story.mjs';
await createStory({ title: '需求标题' }); // 默认客户端模板
await createStory({ title: '需求标题', template: 'server' }); // 服务端模板
await createStory({ title: '需求标题', template: 'design' }); // 策划模板
await createStory({ title: '需求标题', template: 'ui' }); // UI模板
```

### 1V1 需求单模板配置（6种）

| 模板名 (key) | 预设子工作项 (index) | 处理人 |
|------------|-------------------|--------|
| **客户端开单** (`client`) | 客户端[12]、QA[16]、策划[14] | 叶枝君 |
| **服务端开单** (`server`) | 服务端[13]、QA[16]、策划[14] | 陈霄豪 |
| **策划需求单** (`design`) | 策划[14]、QA[16] | 赵乾 |
| **UI需求单** (`ui`) | UI[7]、UI验收[8]、策划[14]、QA[16] | 小冰 |
| **动作需求单** (`motion`) | 2D动作[2]、策划[14]、QA[16] | 肖和 |
| **音频需求单** (`audio`) | 音频[11]、策划[14]、QA[16] | 吴美霞 |

### All 17 Preset Items (index reference)

| Index | Name | Default Owner |
|-------|------|---------------|
| 0 | 原画草稿 | 邝应桥 |
| 1 | 原画完成稿 | 邝应桥 |
| 2 | 2D动作 | 江林;王晓松 |
| 3 | 3D动作 | 樊荣 |
| 4 | 模型 | 杨学美 |
| 5 | 特效 | 肖和 |
| 6 | 特效验收 | 肖和 |
| 7 | **UI** | 狄依格 |
| 8 | **UI验收** | 狄依格 |
| 9 | 动效 | 肖和 |
| 10 | 动效验收 | 肖和 |
| 11 | **音频** | 吴美霞;傅一然 |
| 12 | **客户端** | 王亮亮 |
| 13 | **服务端** | 黄佳瑞 |
| 14 | **策划** | 沈嘉琨 |
| 15 | 文案 | 曹淑琦 |
| 16 | **QA** | 孙章强 |
| 17 | **CCG客户端** | 叶枝君 |
| 18 | **CCG服务端** | 陈霄豪 |
| 19 | **CCG策划** | 赵乾 |
| 20 | **CCG QA** | 周以天 |
| 15 | 文案 | 曹淑琪 |
| 16 | **QA** | 孙章强 |

### Story Form Fields

| Field | ID | Notes |
|-------|-----|-------|
| Title | `#StoryName` | text input |
| Priority | `#StoryPriority` | select (P0-P3) |
| Module | `#StoryModule` | select |
| Version | `#StoryVersion` | select |
| Handler | `#StoryOwnerValue` | autocomplete: type name |
| CC | `#StoryCc` (hidden) | format: `姓名;` |
| Submit | `#btn_save_view` | visible "创建" button |
| Submit & Continue | `#submit_and_continue` | "提交并继续创建" |

## Create a Sub-Story

Set the parent story ID in the "父需求" search field, or set `data[Story][parent_id]` hidden field to the parent story's ID.

## Key Configuration

| Setting | Value |
|---------|-------|
| Workspace ID | `31253609` |
| Bug template ID | `1131253609001000011` |
| Story templated ID | `1131253609001000047` |
| Bug create URL | `/31253609/bugtrace/bugs/add` |
| Bug edit URL | `/31253609/bugtrace/bugs/edit?id={bugId}` |
| Story create URL | `/31253609/prong/stories/add` |
| Submit (return) | `#save_return` (name=`data[save_return]`, value=`提交&返回`) |
| Submit (view) | `#save_view` (name=`data[submit]`, value=`提交&查看`) |
| Cookies file | `workspace/tapd_cookies.json` |
| User IDs | 叶枝君=1415287364, 周以天=1166740146, 谭佳钦=553342158, 陈霄豪(西奥)=TAPD搜`陈霄豪` |
| File upload | `#file_input` (input type=file) |
| Attachments container | `#Attachments`, `.edit-attachment.attachments` |
| Upload trigger | `#upload-attachement` (dropdown toggle, 点击后显示本地上传) |

## Bug Fields

See `references/bug-fields.md` for all available fields, accepted values, and the default template.

## Anti-WAF Measures

1. **Headless mode** (preferred): Apply the full stealth init script:
   - Delete `navigator.webdriver`
   - Override: plugins, languages, hardwareConcurrency
   - Add `window.chrome` object
   - Use real Chrome UA
2. **Headed mode** (fallback): `headless: false` — always works, no WAF issues
