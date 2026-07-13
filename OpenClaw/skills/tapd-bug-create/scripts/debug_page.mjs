import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_DIR = path.resolve(__dirname, '../../../workspace');
const COOKIES_FILE = path.join(WORKSPACE_DIR, 'tapd_cookies.json');

async function main() {
  const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
  });
  const ctx = await browser.newContext({
    locale: 'zh-CN',
    viewport: { width: 1920, height: 1080 },
  });
  await ctx.addCookies(cookies);
  const page = await ctx.newPage();

  await page.goto('https://www.tapd.cn/31253609/bugtrace/bugs/add', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(5000);
  
  // Debug: dump page info
  const url = page.url();
  const title = await page.title();
  console.log('URL:', url);
  console.log('Title:', title);
  
  // Check for key elements
  const elements = await page.evaluate(() => {
    const ids = ['BugTitle', 'BugCurrentOwnerValue', 'BugCc', 'BugDescription', 'BugPriority', 'BugVersionReport', 'BugModule', 'BugCustomFieldOne', '_view', 'save_view', 'save_return', 'submit_and_continue', 'file_input', 'upload-attachement'];
    const result = {};
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) {
        const tag = el.tagName;
        const type = el.type || '';
        const display = window.getComputedStyle(el).display;
        const visible = el.offsetParent !== null;
        const rect = el.getBoundingClientRect();
        const text = el.textContent?.trim().substring(0, 50) || '';
        result[id] = { tag, type, display, visible, rect: { top: rect.top, left: rect.left, w: rect.width, h: rect.height }, text };
      } else {
        result[id] = 'NOT FOUND';
      }
    }
    return result;
  });
  console.log('Elements:', JSON.stringify(elements, null, 2));
  
  // Check for any submit buttons
  const submitBtns = await page.evaluate(() => {
    const btns = [];
    document.querySelectorAll('a, button, input[type=submit], input[type=button]').forEach(el => {
      const text = el.textContent?.trim() || el.value || '';
      if (text.toLowerCase().includes('创建') || text.toLowerCase().includes('提交') || el.id?.includes('save') || el.id?.includes('submit') || el.id === '_view') {
        btns.push({ id: el.id, tag: el.tagName, type: el.type, text: text, display: window.getComputedStyle(el).display });
      }
    });
    return btns;
  });
  console.log('Submit buttons:', JSON.stringify(submitBtns, null, 2));
  
  await page.waitForTimeout(10000);
  await browser.close();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
