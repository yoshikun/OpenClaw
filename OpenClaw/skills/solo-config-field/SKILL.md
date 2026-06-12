---
name: solo-config-field
description: Add fields/columns to Luban config tables in the SoloConfig submodule (client/config/SoloConfig). Trigger when user says "给XX表加字段", "添加字段", "加个新列", or similar requests about modifying game config tables.
---

# SoloConfig 表格字段添加

给 Luban 配置表（SoloConfig 子模块）添加新字段/新列。

## 目录结构

```
E:\Solo\nightoffullmoon\client\config\SoloConfig\   (SoloConfig 子模块根目录)
├── luban.conf             # Luban 主配置
├── Defines/builtin.xml    # 内置类型 (vector2/3/4)
├── Datas/
│   ├── __tables__.xlsx    # 表定义 (name, full_name, input file, mode, group)
│   ├── __beans__.xlsx     # Bean/复合类型定义
│   ├── __enums__.xlsx     # 枚举类型定义
│   ├── Common.xlsx        # KV格式表 (key-value config)
│   ├── Card.xlsx          # 列表格式表 (multiple records)
│   └── ...                # 其他数据表
└── Luban/                 # Luban 工具
```

## 表类型判断

### 1. KV 格式（如 Common.xlsx）

**特征：** 表头第一行为 `##column#var`，每行是一个 key-value 配置项。

**行结构：**
- Col A: 字段名 (`##column#var`)
- Col B: 字段类型 (`##type`)
- Col C: 分组 (`##group`)
- Col D: 注释
- Col E: 默认值 / 具体值

### 2. 列表格式（如 Card.xlsx）

**特征：** 表头第一行为 `##var`，每行是一条数据记录。

**行结构（前三行是固定表头）：**
- Row 1 (`##var`): 字段名，如 `id`, `name`, `type`
- Row 2 (`##type`): 字段类型，如 `int`, `string`, `"(list#sep=,),int"`
- Row 3 (`##group`): 分组标识，如 `c,s`
- Row 4+: 数据行（第一列为空，第二列起为数据）

## 字段类型参考

### 基础类型

| 类型 | 说明 | 在单元格中写入 |
|------|------|---------------|
| `int` | 整型 | `30` |
| `float` | 浮点型 | `0.5` |
| `long` | 长整型 | `2592000` |
| `string` | 字符串 | `text` |
| `bool` | 布尔 | `true` |

### 数组/容器类型

Luban 的容器语法：`(容器名#选项1=值1,选项2=值2),元素类型`

**常用容器：**
- `list` — 有序列表
- `set` — 集合（元素唯一）

**常用分隔符：**
- `#sep=,` — 逗号分隔
- `#sep=\|` — 竖线分隔

**完整参考：**

| 类型写法 | 说明 | 单元格示例 |
|----------|------|-----------|
| `(list#sep=,),int` | 逗号分隔整数数组 | `1,2,3` |
| `(list#sep=,),float` | 逗号分隔浮点数数组 | `0.5,1.2,3.0` |
| `(list#sep=,),long` | 逗号分隔长整数数组 | `100,200,300` |
| `(list#sep=,),string` | 逗号分隔字符串数组 | `a,b,c` |
| `(list#sep=\|),string` | 竖线分隔字符串数组 | `a\|b\|c` |
| `(set#sep=,),int` | 逗号分隔整数集合（元素自动去重） | `27,101` |
| `(set#sep=,),string` | 逗号分隔字符串集合 | `a,b,c` |

### 嵌套数组

| 类型写法 | 说明 | 单元格示例 |
|----------|------|-----------|
| `(list#sep=\|),(list#sep=,),string` | 竖线分隔，每个元素是逗号分隔的字符串列表 | `a,b\|c,d` |

### 引用类型

| 类型写法 | 说明 |
|----------|------|
| `#(ref=表名)` | 引用其他表的主键 |
| `(list#sep=,),int#(ref=TbVoice)` | 引用 TbVoice 的整数数组 |
| `int?#(ref=TbVoice)` | 可选引用 TbVoice 的整数 |

**解析方式：** 引用仅做数据完整性校验，在表格中填写的就是普通的 int 值。
（项目实际例子：HeroSkin 的 `replace_voice_in` 字段类型为 `(list#sep=,),int#(ref=TbVoice)`）

### 枚举引用

枚举定义在 `__enums__.xlsx`，引用格式直接用枚举名。

| 枚举类型 | 枚举值示例（在单元格中写枚举的 value） |
|----------|--------------------------------------|
| `HapticType` | `1` (Selection), `5` (Success) |
| `buff.AnimationType` | `1` (myhero), `-1` (myfield) |
| 其他枚举 | 在 `__enums__.xlsx` 中定义的 value 字段 |

### Bean/结构体引用

复杂结构体定义在 `__beans__.xlsx`，引用后要按 bean 的字段顺序填入值。

| Bean 类型 | 字段结构 | 单元格示例 |
|-----------|---------|-----------|
| `BuffParams` | type(int), props(long[]), target(int), targetProps(long[]) | `1,100,2,200` |
| `TriggerParams` | type(int[]), props(string[]), target(int[]), targetProps(string[]) | `1\|2,a\|b,3\|4,c\|d` |
| `ConditionParams` | type(int[]), props(string[]), target(int[]), targetProps(string[]) | `1,101,2,102` |
| `RewardData` | id(int), count(int) | `11000000,200` |

### 内置类型（Defines/builtin.xml）

| 类型 | 字段 | 单元格示例 |
|------|------|-----------|
| `vector2` | x(float), y(float), 分隔符逗号 | `1.5,2.5` |
| `vector3` | x(float), y(float), z(float), 分隔符逗号 | `1.0,2.0,3.0` |
| `vector4` | x(float), y(float), z(float), w(float), 分隔符逗号 | `1,2,3,4` |

## 类型速查表

**数组 = 用 `(list#sep=,),` 包裹元素类型**

| 你想要 | 写这个 |
|--------|--------|
| int 数组 | `(list#sep=,),int` |
| float 数组 | `(list#sep=,),float` |
| string 数组 | `(list#sep=,),string` |
| float 数组（竖线分隔） | `(list#sep=\|),float` |
| int 集合（去重） | `(set#sep=,),int` |
| 可选 int | `int?` |
| 引用其他表 | `int#(ref=TbTableName)` |

## 流程

### 0. 修改前准备（脚本自动执行）

每次修改前脚本会自动：
1. **git pull** 更新 SoloConfig 子模块
2. **关闭 Excel** — 检查是否有 `EXCEL.EXE` 进程，有则 kill，避免文件被锁定

### 1. 解析需求

确定：
- 哪个表？（如 `Card`、`Common`、`Buff`）
- 字段名是什么？
- 字段类型是什么？
- 分组（`c`/`s`/`e`，默认 `c,s`）
- 默认值
- 插在哪个字段后面（可选）

### 2. 查表定位

通过 `__tables__.xlsx` 查找对应的数据文件：

```bash
node add_field.mjs [table] --help    # 列出所有表
```

### 3. 添加字段

```bash
# 给 Card 表追加文本字段
node add_field.mjs Card newField string --group c,s --desc "新字段"

# 给 Common 表加浮点字段
node add_field.mjs Common newField float --group c --default 0

# 给 Buff 表加列表字段，插在 type 后面
node add_field.mjs Buff newField "(list#sep=,),int" --after type
```

### 4. 后续操作

添加完成后，需要：
1. 建议用户在 Excel 中打开检查格式是否正确
2. 运行 Unity BuildPipeline 的 Luban 代码生成
3. 更新客户端/服务器代码使用新字段
4. 提交 SoloConfig 子模块变更（包含 .git 目录，需在子模块内 commit + push）

## 脚本

- `scripts/add_field.mjs` — 核心脚本，支持给列表表和 KV 表加字段
- 运行路径：从技能目录或任意目录均可（自带 xlsx 依赖）
