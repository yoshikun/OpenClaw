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
    headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
  });
  const ctx = await browser.newContext({
    locale: 'zh-CN',
    viewport: { width: 1920, height: 1080 },
  });
  await ctx.addCookies(cookies);
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  });

  await page.goto('https://www.tapd.cn/31253609/bugtrace/bugs/add', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(5000);
  
  const ownerInput = page.locator('#BugCurrentOwnerValue').first();
  
  // Search various common names/characters
  const searches = ['叶', '赵', '谭', '周', '陈', '沈', '孙', '肖', '吴', '王', '黄', '曹', '邝', '江', '樊', '杨', '狄', '敖'];
  
  for (const search of searches) {
    await ownerInput.click();
    await page.waitForTimeout(300);
    await ownerInput.fill('');
    await page.waitForTimeout(200);
    await page.keyboard.type(search, { delay: 30 });
    await page.waitForTimeout(1500);
    
    const result = await page.evaluate((s) => {
      const menu = document.querySelector('.tt-dropdown-menu');
      if (!menu) return { search: s, items: [], found: false };
      const suggs = menu.querySelectorAll('.tt-suggestion');
      return {
        search: s,
        items: Array.from(suggs).map(el => el.textContent.trim()),
        found: suggs.length > 0
      };
    }, search);
    
    if (result.found) {
      console.log(`"${search}": ${JSON.stringify(result.items)}`);
    }
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await ownerInput.fill('');
    await page.waitForTimeout(200);
  }

  await browser.close();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
