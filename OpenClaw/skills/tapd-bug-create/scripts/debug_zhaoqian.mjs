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

  // Try typing in the TinyMCE description iframe
  const descIframe = page.frame({ url: /.*/ }).childFrames().find(f => f.url().includes('tinymce'));
  console.log('Child frames:', page.frames().map(f => f.url()).filter(u => u));

  // Try all frames
  const allFrames = page.frames();
  console.log('\nAll frames:');
  allFrames.forEach((f, i) => {
    console.log(`  Frame ${i}: url="${f.url()}", name="${f.name()}"`);
  });

  // Try to find the TinyMCE frame by ID
  const tinymceFrame = page.frame({ url: /about:blank/ });
  console.log('\nAbout:blank frames:', allFrames.filter(f => f.url() === 'about:blank').length);

  // Let's try typing in the iframe
  const bugDescIframe = page.frameLocator('#BugDescription_ifr');
  const body = bugDescIframe.locator('body');
  try {
    await body.click();
    await page.waitForTimeout(500);
    await body.fill('通行证奖励预览中，卡牌描述文本显示错误，请参考截图。需要检查通行证奖励预览界面的卡牌描述数据来源，修复描述文本。');
    console.log('Description typed in TinyMCE iframe');
    
    // Check if the textarea got updated
    await page.waitForTimeout(1000);
    const descVal = await page.evaluate(() => document.querySelector('#BugDescription')?.value || 'empty');
    console.log('BugDescription hidden value:', descVal.substring(0, 100));
  } catch (e) {
    console.log('TinyMCE input error:', e.message);
    
    // Try alternative: page.keyboard
    try {
      // Click in the description area
      const descArea = page.locator('.edit-description').first();
      await descArea.click();
      await page.waitForTimeout(1000);
      
      await page.keyboard.type('Test description via keyboard', { delay: 50 });
      await page.waitForTimeout(500);
      const descVal = await page.evaluate(() => document.querySelector('#BugDescription')?.value || 'empty');
      console.log('BugDescription value after keyboard:', descVal.substring(0, 100));
    } catch (e2) {
      console.log('Keyboard approach also failed:', e2.message);
    }
  }

  // Search for 赵乾 with pinyin
  console.log('\nSearching for 赵乾 with pinyin "zhaoqian"...');
  const ownerInput = page.locator('#BugCurrentOwnerValue').first();
  await ownerInput.click();
  await page.waitForTimeout(300);
  await ownerInput.fill('');
  await page.waitForTimeout(200);
  await page.keyboard.type('zhaoqian', { delay: 50 });
  await page.waitForTimeout(2000);
  
  const suggestAfterPinyin = await page.evaluate(() => {
    const menu = document.querySelector('.tt-dropdown-menu');
    if (!menu) return { found: false };
    return {
      found: true,
      items: Array.from(menu.querySelectorAll('.tt-suggestion')).map(s => s.textContent.trim())
    };
  });
  console.log('Pinyin search results:', JSON.stringify(suggestAfterPinyin));

  await page.screenshot({ path: 'debug_zhaoqian.png', fullPage: true });
  await browser.close();
}
debug().catch(e => { console.error('Error:', e.message); process.exit(1); });
