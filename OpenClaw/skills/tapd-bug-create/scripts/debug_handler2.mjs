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

  // Fill basic fields
  await page.fill('#BugTitle', 'Test bug - please ignore');
  await page.selectOption('#BugVersionReport', '【1V1】正式版本V4.0');
  await page.selectOption('#BugPriority', 'P2');
  await page.selectOption('#BugModule', '1V1');
  await page.selectOption('#BugCustomFieldOne', 'YZY_1V1 V1.0 Beta');

  // Try typing "赵乾" 
  const ownerInput = page.locator('#BugCurrentOwnerValue').first();
  await ownerInput.click();
  await page.waitForTimeout(500);
  
  // Use fill (not type) like the original script does
  await ownerInput.fill('赵乾');
  await page.waitForTimeout(2500);

  // Look at ALL suggestions in detail
  const suggestionInfo = await page.evaluate(() => {
    const menu = document.querySelector('.tt-dropdown-menu');
    if (!menu) return { visible: false, all: [] };
    
    const suggestions = menu.querySelectorAll('.tt-suggestion');
    return {
      visible: true,
      all: Array.from(suggestions).map(s => ({
        text: s.textContent.trim(),
        html: s.innerHTML.substring(0, 300),
        pinyin: s.getAttribute('data-pinyin') || ''
      }))
    };
  });
  console.log('Suggestions:', JSON.stringify(suggestionInfo, null, 2));

  // If we found suggestions, try clicking the one containing "赵乾"
  if (suggestionInfo.visible && suggestionInfo.all.length > 0) {
    // Try clicking first suggestion
    const allSuggestions = page.locator('.tt-suggestion');
    const count = await allSuggestions.count();
    console.log('Total .tt-suggestion elements:', count);
    
    for (let i = 0; i < count; i++) {
      const text = await allSuggestions.nth(i).textContent().catch(() => '');
      console.log(`Suggestion ${i}: "${text.trim()}"`);
    }
  }

  // Now let's also try what happens after pressing Enter when we've typed "赵乾"
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  
  // Check the hidden field value
  const ownerHidden = await page.locator('#BugCurrentOwner').inputValue().catch(() => 'error');
  console.log('BugCurrentOwner hidden value after Enter:', ownerHidden);
  console.log('BugCurrentOwnerValue visible value:', await page.locator('#BugCurrentOwnerValue').first().inputValue().catch(() => ''));

  await page.screenshot({ path: 'debug_handler2.png', fullPage: true });

  await browser.close();
}
debug().catch(e => { console.error('Error:', e.message); process.exit(1); });
