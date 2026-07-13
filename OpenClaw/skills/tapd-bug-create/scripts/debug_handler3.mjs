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

  // Basic fields
  await page.fill('#BugTitle', 'Test bug - please ignore');
  await page.selectOption('#BugVersionReport', '【1V1】正式版本V4.0');
  await page.selectOption('#BugPriority', 'P2');
  await page.selectOption('#BugModule', '1V1');
  await page.selectOption('#BugCustomFieldOne', 'YZY_1V1 V1.0 Beta');

  // Clear input first, then type character by character
  const ownerInput = page.locator('#BugCurrentOwnerValue').first();
  await ownerInput.click();
  await page.waitForTimeout(300);
  await ownerInput.fill('');  // clear
  await page.waitForTimeout(200);

  // Type each character with delay
  const name = '赵乾';
  for (const ch of name) {
    await ownerInput.type(ch, { delay: 150 });
    await page.waitForTimeout(300);
  }
  
  // Wait for autocomplete to fully load
  await page.waitForTimeout(3000);

  // Get all suggestions
  const info = await page.evaluate(() => {
    const menu = document.querySelector('.tt-dropdown-menu');
    if (!menu) return 'No dropdown menu found';
    
    const suggestions = menu.querySelectorAll('.tt-suggestion');
    return Array.from(suggestions).map(s => ({
      text: s.textContent.trim(),
      html: s.innerHTML.substring(0, 400)
    }));
  });
  console.log('Suggestions after typing "赵乾":');
  console.log(JSON.stringify(info, null, 2));

  // Try selecting first suggestion
  const suggCount = await page.locator('.tt-suggestion').count();
  console.log('TT-suggestion count:', suggCount);
  
  if (suggCount > 0) {
    const firstSugg = page.locator('.tt-suggestion').first();
    const text = await firstSugg.textContent();
    console.log('First suggestion text:', text.trim());
    await firstSugg.click();
    await page.waitForTimeout(1000);
    
    const hiddenVal = await page.locator('#BugCurrentOwner').inputValue().catch(() => '');
    console.log('BugCurrentOwner after click:', hiddenVal);
    console.log('Visible value:', await page.locator('#BugCurrentOwnerValue').first().inputValue().catch(() => ''));
  }

  await page.screenshot({ path: 'debug_handler3.png', fullPage: true });
  console.log('Screenshot saved');

  await browser.close();
}
debug().catch(e => { console.error('Error:', e.message); process.exit(1); });
