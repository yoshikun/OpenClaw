---
name: gitlab-permission
description: 管理 git.devcloud.ztgame.com 上的 GitLab 项目成员权限。支持添加/删除/修改成员，查询项目成员列表。  
  触发词：git权限、加git权限、管理git、项目成员、gitlab权限。  
  适用：yyzy_proj 组下的项目，叶枝君账号（Maintainer/Owner 权限）。
---

# GitLab 权限管理

## 前置条件

- Cookie：`workspace/gitlab_cookies.json`（已保存 _gitlab_session）
- 仅对叶枝君具有 **Maintainer(40)** 或 **Owner(50)** 权限的项目可操作

## 管理的项目组（8 个核心仓库）

当说「给 XX 加项目权限」时，以下 8 个仓库全部加 **Reporter(20)**（只读），除非主人明确要求更高级别：

| # | 仓库 | ID | 我的权限 |
|:-:|------|:--:|:--------:|
| 1 | yyzy_proj/1v1/config | 5058 | Maintainer ✅ |
| 2 | yyzy_proj/gordian/gameconfig | 4710 | Owner ✅ |
| 3 | yyzy_proj/framework/DidaFramework | 5048 | Maintainer ✅ |
| 4 | yyzy_proj/1v1/battle1v1 | 5145 | Maintainer ✅ |
| 5 | yyzy_proj/1v1/proto | 5060 | Maintainer ✅ |
| 6 | yyzy/develop_client/nightoffullmoon | 2751 | Owner ✅ |
| 7 | didastudio/cdn_251121 | 5638 | Maintainer ✅ |
| 8 | yezhijun1/cdn_solo | 5871 | Owner ✅ |

## 权限等级

| 等级 | 名称 | 值 |
|:----:|------|:--:|
| 10 | Guest | 访客 |
| 20 | Reporter | 报告者 |
| 30 | Developer | 开发者 |
| 40 | Maintainer | 维护者 |
| 50 | Owner | 拥有者 |

## 已知用户 ID

| 姓名 | 用户名 | ID |
|------|--------|:--:|
| 叶枝君 | @yezhijun | 983 |
| 周以天 | @v-zhouyitian | 1003 |
| 陈霄豪 | @chenxiaohao | 1134 |
| 胡新雷 | @v-huxinlei | 1836 |
| 石迪安 | @shidian | 2085 |

## API 用法

## 认证方式

GitLab 使用公司 Keycloak SSO 登录（LDAP/CAS），需要从已登录的浏览器获取 Cookie + CSRF Token。

**Cookie 文件:** `workspace/gitlab_cookies.json`
**CSRF Token 文件:** `workspace/gitlab_csrf.json`

**写操作（POST/PUT/DELETE）** 需要 `X-CSRF-Token` 头，否则返回 401。
登录方式：打开 headed 浏览器 → 手动 SSO 登录（先点 SSO → Keycloak 再输一次密码）→ 自动保存 Cookie + CSRF Token。

```javascript
const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
const headers = { 'Cookie': cookieStr, 'Accept': 'application/json' };
const writeHeaders = { ...headers, 'Content-Type': 'application/x-www-form-urlencoded', 'X-CSRF-Token': csrfToken };
const GITLAB = 'https://git.devcloud.ztgame.com';
```

> `git_permission.mjs` 已自动处理 CSRF Token：`getHeaders()` 用于读取，`getWriteHeaders()` 用于写入。

### 查询项目成员
```bash
GET /api/v4/projects/{project_id}/members/all?per_page=100
```

### 批量添加到 8 个核心仓库（给项目加权限）
```bash
node scripts/git_permission.mjs batch <用户名称> developer
```

### 添加成员（单一仓库）
```bash
POST /api/v4/projects/{project_id}/members
Body: user_id={user_id}&access_level={10|20|30|40}
```

### 修改成员权限
```bash
PUT /api/v4/projects/{project_id}/members/{user_id}
Body: access_level={10|20|30|40}
```

### 删除成员
```bash
DELETE /api/v4/projects/{project_id}/members/{user_id}
```

### 搜索用户
```bash
GET /api/v4/users?search={用户名}
```
