import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const WORKSPACE_DIR = path.resolve('../../../workspace');
const COOKIES_FILE = path.join(WORKSPACE_DIR, 'tapd_cookies.json');

async function debug() {
  const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
  });
  const ctx = await browser.newContext({
    locale: 'zh-CN',
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  });
  await ctx.addCookies(cookies);
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  });

  await page.goto('https://www.tapd.cn/31253609/bugtrace/bugs/add', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(5000);

  // Try various search terms to find users
  const searches = ['赵', '周', '谭', '叶', '陈', '小', '沈', '孙', '吴', '黄', '王', '狄', '肖', '江', '邝', '樊', '曹', '傅'];
  
  const ownerInput = page.locator('#BugCurrentOwnerValue').first();
  
  for (const search of searches) {
    await ownerInput.click();
    await page.waitForTimeout(200);
    await ownerInput.fill('');
    await page.waitForTimeout(200);
    await page.keyboard.type(search, { delay: 50 });
    await page.waitForTimeout(1500);
    
    const suggestions = await page.evaluate((s) => {
      const menu = document.querySelector('.tt-dropdown-menu');
      if (!menu) return { search: s, found: false, items: [] };
      const suggs = menu.querySelectorAll('.tt-suggestion');
      return {
        search: s,
        found: true,
        items: Array.from(suggs).map(el => el.textContent.trim())
      };
    }, search);
    
    if (suggestions.found && suggestions.items.length > 0) {
      console.log(`"${search}": ${JSON.stringify(suggestions.items)}`);
    }
    
    // Clear for next search
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await ownerInput.fill('');
    await page.waitForTimeout(300);
  }

  await browser.close();
}
debug().catch(e => { console.error('Error:', e.message); process.exit(1); });
