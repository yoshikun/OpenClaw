/**
 * GitLab 权限管理工具
 * 
 * 用法:
 *   node scripts/git_permission.mjs list <project_id>                          # 查看项目成员
 *   node scripts/git_permission.mjs add <project_id> <user_name> <level>       # 添加成员
 *   node scripts/git_permission.mjs update <project_id> <user_name> <level>    # 修改权限
 *   node scripts/git_permission.mjs remove <project_id> <user_name>            # 删除成员
 *   node scripts/git_permission.mjs search <keyword>                           # 搜索用户
 *   node scripts/git_permission.mjs projects                                    # 列出可管理的项目
 * 
 * 权限等级: guest(10) / reporter(20) / developer(30) / maintainer(40) / owner(50)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WS_DIR = path.resolve(__dirname, '..', '..', '..', 'workspace');
const COOKIES_FILE = path.join(WS_DIR, 'gitlab_cookies.json');
const GITLAB = 'https://git.devcloud.ztgame.com';

const LEVEL_MAP = {
  guest: 10, '10': 10,
  reporter: 20, '20': 20,
  developer: 30, '30': 30,
  maintainer: 40, '40': 40,
  owner: 50, '50': 50,
};
const LEVEL_NAMES = { 10: 'Guest', 20: 'Reporter', 30: 'Developer', 40: 'Maintainer', 50: 'Owner' };

function getHeaders() {
  const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
  return { 'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; '), 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' };
}

async function searchUser(keyword) {
  const r = await fetch(`${GITLAB}/api/v4/users?search=${encodeURIComponent(keyword)}&per_page=10`, { headers: getHeaders() });
  const users = await r.json();
  if (!Array.isArray(users) || users.length === 0) return console.log('未找到用户:', keyword);
  return users.map(u => ({ id: u.id, name: u.name, username: u.username }));
}

async function findUsers(name) {
  const users = await searchUser(name);
  if (!users) throw new Error(`找不到用户: ${name}`);
  if (users.length === 1) return users[0];
  // 精确匹配
  const exact = users.find(u => u.name === name || u.username === name.replace('@', ''));
  if (exact) return exact;
  console.log(`找到多个用户匹配 "${name}"，请指定更精确的名称:`);
  users.forEach(u => console.log(`  ${u.name} (@${u.username})`));
  throw new Error('多匹配');
}

async function listMembers(projectId) {
  const r = await fetch(`${GITLAB}/api/v4/projects/${projectId}/members/all?per_page=100`, { headers: getHeaders() });
  if (!r.ok) { const t = await r.text(); throw new Error(`API error: ${t.substring(0, 100)}`); }
  const members = await r.json();
  console.log(`项目成员 (${members.length} 人):`);
  members.forEach(m => console.log(`  ${m.name} (@${m.username}) - ${LEVEL_NAMES[m.access_level] || m.access_level}${m.id === 983 ? ' (就是你)' : ''}`));
}

async function addMember(projectId, userName, level) {
  const user = await findUsers(userName);
  const headers = getHeaders();
  const body = new URLSearchParams({ user_id: String(user.id), access_level: String(LEVEL_MAP[level]) });
  const r = await fetch(`${GITLAB}/api/v4/projects/${projectId}/members`, { method: 'POST', headers, body: body.toString() });
  const result = await r.json();
  if (r.ok) console.log(`✅ 已添加 ${user.name} (@${user.username}) 为 ${LEVEL_NAMES[result.access_level]}`);
  else console.error(`❌ 失败:`, result.message || JSON.stringify(result));
}

async function updateMember(projectId, userName, level) {
  const user = await findUsers(userName);
  const headers = getHeaders();
  const body = new URLSearchParams({ access_level: String(LEVEL_MAP[level]) });
  const r = await fetch(`${GITLAB}/api/v4/projects/${projectId}/members/${user.id}`, { method: 'PUT', headers, body: body.toString() });
  const result = await r.json();
  if (r.ok) console.log(`✅ 已更新 ${user.name} (@${user.username}) 为 ${LEVEL_NAMES[result.access_level]}`);
  else console.error(`❌ 失败:`, result.message || JSON.stringify(result));
}

async function removeMember(projectId, userName) {
  const user = await findUsers(userName);
  const r = await fetch(`${GITLAB}/api/v4/projects/${projectId}/members/${user.id}`, { method: 'DELETE', headers: getHeaders() });
  if (r.ok || r.status === 204) console.log(`✅ 已移除 ${user.name} (@${user.username})`);
  else { const t = await r.text(); console.error(`❌ 失败:`, t.substring(0, 200)); }
}

async function listProjects() {
  const r = await fetch(`${GITLAB}/api/v4/projects?membership=true&per_page=100&min_access_level=40`, { headers: getHeaders() });
  const projects = await r.json();
  console.log(`可管理的项目 (${projects.length}):`);
  projects.forEach(p => console.log(`  ${p.path_with_namespace} (id=${p.id}) - 我的权限: ${LEVEL_NAMES[p.permissions?.project_access?.access_level] || '?'}`));
}

async function main() {
  const cmd = process.argv[2];
  if (!cmd) {
    console.log('用法: node scripts/git_permission.mjs <命令> [参数...]');
    console.log('命令: list, add, update, remove, search, projects');
    return;
  }

  try {
    if (cmd === 'list') await listMembers(process.argv[3]);
    else if (cmd === 'add') await addMember(process.argv[3], process.argv[4], process.argv[5]);
    else if (cmd === 'update') await updateMember(process.argv[3], process.argv[4], process.argv[5]);
    else if (cmd === 'remove') await removeMember(process.argv[3], process.argv[4]);
    else if (cmd === 'search') {
      const users = await searchUser(process.argv[3]);
      if (users) users.forEach(u => console.log(`${u.name} (@${u.username}) id=${u.id}`));
    }
    else if (cmd === 'projects') await listProjects();
    else console.log('未知命令:', cmd);
  } catch(e) { console.error('错误:', e.message); }
}

main();
