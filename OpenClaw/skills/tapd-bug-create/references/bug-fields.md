# TAPD 工作项字段参考 (月圆之夜 Workspace 31253609)

---

## 缺陷 (Bug)

### 默认模板 (基于 #1016508)

| 字段 | 默认值 | 说明 |
|-------|--------|------|
| 发现版本 | `【1V1】正式版本V4.0` | 可选：V4.0, V3.0, S12.0, B0.5, S11.6等（见下方版本列表） |
| 处理人 | 按类型分配（见下方规则） | 格式: `姓名;` |
| 抄送人 | `周以天;` | **所有 bug 单必加兵王** |
| 优先级 | `P2` | |
| 研发分支 | `YZY_1V1 V1.0 Beta` | |
| 模块 | `1V1` | |

### 处理人分配规则

| Bug 类型 | 默认处理人 | 格式 |
|----------|-----------|------|
| 程序 (Code) | 叶枝君 | `叶枝君;` |
| 策划 (Design) | 赵乾 | `赵乾;` |
| UI | 小冰 | `小冰;` |
| 特效 (Effect) | 肖和 | `肖和;` |

### 可用发现版本（2026-06 更新）

```
【1V1】正式版本V4.0
【1V1】正式版本V3.0
【S12.0】
【B0.5】
【S11.6】商业化版本
【0813周版本】
【0806周版本】
【S12.0线上热更】
【0730周版本】
【小程序】
【S11.6】线上热更
【S12.6】商业化版本
【S12.5】商业化版本
【0723周版本】
【0716周版本】
【0709周版本】
【0702周版本】
【V2.0线上热更】
【0528周版本】
【0618周版本】
【0611周版本】
【0604周版本】
【单机】A1.2
【需求池】
```

### Bug 创建页面 & 提交

- **URL**: `https://www.tapd.cn/31253609/bugtrace/bugs/add`
- **提交按钮**: `#save_return` (值="提交&返回")

### Bug 表单字段

| Field | HTML ID | Form Name | Type | Required |
|-------|---------|-----------|------|----------|
| 标题 | `#BugTitle` | `data[Bug][title]` | text | ✅ |
| 发现版本 | `#BugVersionReport` | `data[Bug][version_report]` | select | ✅ |
| 处理人 | `#BugCurrentOwner` (hidden) | `data[Bug][current_owner]` | hidden | ✅ 格式: `姓名;` 如 `谭佳钦;` |
| 处理人(显示) | `#BugCurrentOwnerValue` | (none) | text | 填 `姓名` 触发自动补全 |
| 抄送人 | `#BugCc` (hidden) | `data[Bug][cc]` | hidden | 格式: `姓名;` 如 `周以天;` |
| 优先级 | `#BugPriority` | `data[Bug][priority]` | select | ✅ |
| 研发分支 | `#BugCustomFieldOne` | `data[Bug][custom_field_one]` | select | ✅ |
| 模块 | `#BugModule` | `data[Bug][module]` | select | ✅ |
| 描述 | `#BugDescription` (hidden textarea) | `data[Bug][description]` | hidden | |
| 关联需求 | `#BugStoryRelationBugStoryRelationRelativeId` | `data[BugStoryRelation][BugStoryRelation_relative_id]` | hidden | |
| template_id | (hidden) | `data[template_id]` | hidden | ✅ |

---

## 需求 (Story)

### 模版需求 #1131253609001037046

| 字段 | 值 |
|------|-----|
| Title | 【0528】周版本 主界面新增新人任务 |
| Owner | 敖亚军 |
| Priority | P1 |
| Module | 1V1 |
| Version | 【0528周版本】 |
| Templated ID | `1131253609001000047` |
| Workitem Type ID | `1131253609001000049` |
| Children | 1131253609001037047 ~ 1131253609001037051 (5个子需求) |

Children 存储格式：`children_id` = `||id1|id2|id3|...`

### Story 创建页面 & 提交

- **URL**: `https://www.tapd.cn/31253609/prong/stories/add`
- **提交方式**: 动态创建 submit input 并点击（见 scripts/create_story.mjs）
- **提交按钮 name**: `data[save_return]` (值="提交&返回")

### Story 表单字段

| Field | HTML ID | Form Name | Type | Required |
|-------|---------|-----------|------|----------|
| 标题 | `#StoryName` | `data[Story][name]` | text | ✅ |
| 父需求 | (search input) | `data[Story][parent_id]` | autocomplete | (for sub-stories) |
| 优先级 | `#StoryPriority` | `data[Story][priority]` | select | ✅ |
| 模块 | `#StoryModule` | `data[Story][module]` | select | |
| 版本 | `#StoryVersion` | `data[Story][version]` | select | ✅ |
| 迭代 | - | `data[Story][iteration_id]` | select | |
| 需求分级 | - | `data[Story][custom_field_one]` | select (S/A/B/C) | |
| 资产类型 | - | `data[Story][custom_field_two]` | select | |
| 预估工时 | - | `data[Story][effort]` | text | |
| 预计开始 | - | `data[Story][begin]` | date | |
| 预计结束 | - | `data[Story][due]` | date | |
| 处理人 | `#StoryOwner` (hidden) | `data[Story][owner]` | hidden | |
| 抄送人 | `#StoryCc` (hidden) | `data[Story][cc]` | hidden | |

### 预设子工作项

创建需求时，可通过 `data[PresetItems][N][create_task]` 勾选预设的子工作项（共17个预设，如 T 任务、N 月圆新手、F 月圆战斗、S 战斗子任务等）。

---

## 通用

### 优先级

| Label | Value |
|-------|-------|
| P0 | `P0` |
| P1 | `P1` |
| P2 | `P2` |
| P3 | `P3` |

### 版本 (发现版本/Version)

`【1V1】正式版本V2.0` `【S11.6】商业化版本` `【V2.0线上热更】` `【0528周版本】` `【1V1】正式版本V3.0` `【0618周版本】` `【0611周版本】` `【0604周版本】` `【0521周版本】` `【S12.0】` `【单机】A1.2` `【需求池】` `【B0.5】`

### 模块

`运营` `背包玩法` `1V1` `策划案` `核心玩法` `系统功能` `新手体验` `商业化` `活动` `基建` `音频` `优化` `赛事`

### 研发分支

`master` `【S11.5】` `【S11.0】` `【S10.6】` `【1V1】删档测试 V0.95` `【1V1】正式版本 V1.0` `【S10.0】` `YYZY_1V1_V1.0` `YZY_1V1 V1.0 Beta`

### 用户 ID

| Name | TAPD User ID |
|------|-------------|
| 叶枝君 | `1415287364` |
| 周以天(兵王) | `1166740146` |
| 谭佳钦(小骑士) | `553342158` |

### 提交按钮

| ID | Name | Value | Action |
|----|------|-------|--------|
| `#save_view` | `data[submit]` | `提交&查看` | 创建并查看详情 |
| `#save_return` | `data[save_return]` | `提交&返回` | 创建并返回列表 |
| `#save_draft` | `data[save_draft]` | `保存草稿` | 保存草稿 |
