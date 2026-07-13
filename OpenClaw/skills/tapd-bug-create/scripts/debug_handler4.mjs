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

  // Click on the handler input to focus it
  const ownerInput = page.locator('#BugCurrentOwnerValue').first();
  await ownerInput.click();
  await page.waitForTimeout(500);

  // Method 1: Use page.keyboard.type (real keyboard events)
  await page.keyboard.type('赵', { delay: 200 });
  await page.waitForTimeout(2000);

  const stateAfterFirst = await page.evaluate(() => {
    const menu = document.querySelector('.tt-dropdown-menu');
    if (!menu) return { found: false };
    const suggestions = menu.querySelectorAll('.tt-suggestion');
    return {
      found: true,
      suggestions: Array.from(suggestions).map(s => s.textContent.trim())
    };
  });
  console.log('After typing "赵":', JSON.stringify(stateAfterFirst));

  // Continue typing
  await page.keyboard.type('乾', { delay: 200 });
  await page.waitForTimeout(2000);

  const stateAfterFull = await page.evaluate(() => {
    const menu = document.querySelector('.tt-dropdown-menu');
    if (!menu) return { found: false };
    const suggestions = menu.querySelectorAll('.tt-suggestion');
    return {
      found: true,
      suggestions: Array.from(suggestions).map(s => s.textContent.trim()),
      inputVal: document.querySelector('#BugCurrentOwnerValue')?.value || ''
    };
  });
  console.log('After typing "赵乾":', JSON.stringify(stateAfterFull));

  // Now press Enter
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);

  const finalState = await page.evaluate(() => {
    return {
      hiddenOwner: document.querySelector('#BugCurrentOwner')?.value || '',
      visibleValue: document.querySelector('#BugCurrentOwnerValue')?.value || ''
    };
  });
  console.log('After Enter:', JSON.stringify(finalState));

  await page.screenshot({ path: 'debug_handler4.png', fullPage: true });

  await browser.close();
}
debug().catch(e => { console.error('Error:', e.message); process.exit(1); });
