import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_DIR = path.resolve(__dirname, '../../../workspace');
const COOKIES_FILE = path.join(WORKSPACE_DIR, 'tapd_cookies.json');

const STEALTH = () => {
  delete Object.getOwnPropertyDescriptor(navigator, 'webdriver')?.get;
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] });
  Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN','zh'] });
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
  window.chrome = { runtime: {}, loadTimes: ()=>{}, csi: ()=>{}, app: {} };
};

const ATTACHMENTS = [
  'C:\\Users\\yyzypublic\\.openclaw\\workspace\\tapd_attachment_pass_desc_bug.jpg',
  'C:\\Users\\yyzypublic\\.openclaw\\workspace\\tapd_attachment_pass_1.jpg',
  'C:\\Users\\yyzypublic\\.openclaw\\workspace\\tapd_attachment_pass_2.jpg',
].filter(f => fs.existsSync(f));

async function autoCompleteUser(page, inputLocator, searchText) {
  await inputLocator.click();
  await page.waitForTimeout(300);
  await inputLocator.fill('');
  await page.waitForTimeout(200);
  await inputLocator.type(searchText, { delay: 50 });
  await page.waitForTimeout(2000);
  
  const result = await page.evaluate(() => {
    const menu = document.querySelector('.tt-dropdown-menu');
    if (!menu) return { found: false, items: [] };
    const items = Array.from(menu.querySelectorAll('.tt-suggestion')).map(el => el.textContent.trim());
    return { found: items.length > 0, items };
  });
  
  if (result.found) {
    await page.locator('.tt-suggestion').first().click();
    await page.waitForTimeout(500);
  }
  return result;
}

async function main() {
  const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1920, height: 1080 } });
  await ctx.addCookies(cookies);
  const page = await ctx.newPage();
  await page.addInitScript(STEALTH);

  try {
    await page.goto('https://www.tapd.cn/31253609/bugtrace/bugs/add', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => page.waitForTimeout(5000));
    await page.waitForTimeout(3000);

    // Search for available handlers
    const ownerInput = page.locator('#BugCurrentOwnerValue').first();
    
    // Try searching for various handlers
    const searchNames = ['赵', '叶', '谭', '周', '沈'];
    const availableUsers = {};
    
    for (const name of searchNames) {
      const r = await autoCompleteUser(page, ownerInput, name);
      availableUsers[name] = r;
      if (r.items.length > 0) {
        console.log(`Users matching "${name}": ${JSON.stringify(r.items)}`);
      }
      // Clear the field
      await ownerInput.click();
      await page.waitForTimeout(100);
      await ownerInput.fill('');
      await page.waitForTimeout(200);
    }

    // Now fill the actual bug
    // Title
    await page.fill('#BugTitle', '【通行证】获得卡牌描述文本错误');
    console.log('Title filled');

    // Version
    await page.selectOption('#BugVersionReport', '【1V1】正式版本V4.0');
    console.log('Version set');

    // Priority
    await page.selectOption('#BugPriority', 'P2');
    console.log('Priority set');

    // Module
    await page.selectOption('#BugModule', '1V1');
    console.log('Module set');

    // Branch
    await page.selectOption('#BugCustomFieldOne', 'YZY_1V1 V1.0 Beta');
    console.log('Branch set');

    // Handler - try 叶枝君 (CCG client, the reporter)
    const handlerResult = await autoCompleteUser(page, ownerInput, '叶枝君');
    console.log(`Handler search "叶枝君":`, JSON.stringify(handlerResult));

    // Also search for more users
    await page.waitForTimeout(500);

    // Fill CC via JavaScript
    await page.evaluate(() => {
      const c = document.querySelector('#BugCc');
      if (c) { c.value = '周以天;'; c.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    console.log('CC set');

    // Description
    await page.evaluate(() => {
      const d = document.querySelector('#BugDescription');
      if (d) {
        d.value = '通行证奖励预览中，卡牌描述文本显示错误，请参考截图。\n\n需要检查通行证奖励预览界面的卡牌描述数据来源，修复描述文本。';
        d.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    console.log('Description set');

    // Upload attachments
    for (const att of ATTACHMENTS) {
      try {
        const uploadBtn = page.locator('#upload-attachement').first();
        if (await uploadBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
          await uploadBtn.click();
          await page.waitForTimeout(1000);
        }
        await page.locator('#file_input').first().setInputFiles(att);
        console.log(`Uploading: ${path.basename(att)}`);
        await page.waitForTimeout(6000);
      } catch(e) {
        console.log(`Upload error for ${att}: ${e.message}`);
      }
    }

    // Submit - click #_view
    await page.waitForTimeout(1000);
    await page.click('#_view');
    console.log('Clicked #_view submit');
    
    await page.waitForTimeout(5000);
    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);
    
    if (finalUrl.includes('bugtrace/bugs/add')) {
      // Still on add page, try submit_and_continue
      await page.click('#submit_and_continue');
      console.log('Clicked #submit_and_continue');
      await page.waitForTimeout(5000);
      const url2 = page.url();
      console.log('URL after submit_and_continue:', url2);
      
      if (url2.includes('bugtrace/bugs/add')) {
        // Check for validation errors
        await page.screenshot({ path: path.join(WORKSPACE_DIR, 'bug_fail.png'), fullPage: true });
        console.log('Still on add page, checking for errors...');
        const validationErrors = await page.evaluate(() => {
          const errs = [];
          document.querySelectorAll('.field-error, .error, .alert-error, .help-inline, .parsley-error-list li, [class*=error]').forEach(el => {
            const t = el.textContent.trim();
            if (t) errs.push(t);
          });
          return errs;
        });
        console.log('Validation errors:', JSON.stringify(validationErrors));
        console.log('FAILED: Bug not created');
      } else {
        console.log('SUCCESS! Bug URL:', url2);
      }
    } else {
      console.log('SUCCESS! Bug URL:', finalUrl);
    }
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
