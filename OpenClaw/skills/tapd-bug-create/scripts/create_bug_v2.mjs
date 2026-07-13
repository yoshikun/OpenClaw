import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_DIR = path.resolve(__dirname, '../../../workspace');
const COOKIES_FILE = path.join(WORKSPACE_DIR, 'tapd_cookies.json');
const WORKSPACE_ID = '31253609';

const STEALTH_INIT = () => {
  delete navigator.webdriver;
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh'] });
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
  window.chrome = { runtime: {}, loadTimes: function(){}, csi: function(){}, app: {} };
};

async function main() {
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
  await page.addInitScript(STEALTH_INIT);

  try {
    // 1. 打开 bug 创建页面
    const url = `https://www.tapd.cn/${WORKSPACE_ID}/bugtrace/bugs/add`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    const pageTitle = await page.title();
    console.log('Page URL:', currentUrl);
    console.log('Page title:', pageTitle);
    
    if (pageTitle.includes('WAF')) {
      throw new Error('WAF blocked');
    }
    if (currentUrl.includes('login') || pageTitle.includes('登录')) {
      throw new Error('Cookies expired - redirected to login');
    }

    // 2. Fill basic fields
    await page.fill('#BugTitle', '【通行证】获得卡牌描述文本错误');
    console.log('Title filled');
    
    await page.selectOption('#BugVersionReport', '【1V1】正式版本V4.0');
    console.log('Version selected');
    
    await page.selectOption('#BugPriority', 'P2');
    console.log('Priority selected');
    
    await page.selectOption('#BugModule', '1V1');
    console.log('Module selected');
    
    await page.selectOption('#BugCustomFieldOne', 'YZY_1V1 V1.0 Beta');
    console.log('Branch selected');

    // 3. Handler - 赵乾 (use type with delay for autocomplete)
    const ownerInput = page.locator('#BugCurrentOwnerValue').first();
    await ownerInput.click();
    await page.waitForTimeout(300);
    await ownerInput.type('赵乾', { delay: 120 });
    await page.waitForTimeout(2000);

    const suggCount = await page.locator('.tt-suggestion').count();
    console.log('Suggestions found:', suggCount);
    
    if (suggCount > 0) {
      const suggText = await page.locator('.tt-suggestion').first().textContent().catch(() => '');
      console.log('First suggestion text:', suggText);
      await page.locator('.tt-suggestion').first().click();
      console.log('Handler autocomplete clicked');
      await page.waitForTimeout(1000);
    } else {
      // Try pressing Enter directly
      console.log('No autocomplete, pressing Enter');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }

    // 4. CC - 周以天
    // Use evaluate to set the autocomplete-style hidden input
    await page.evaluate(() => {
      const ccInput = document.querySelector('#BugCcValue');
      if (ccInput) {
        ccInput.value = '周以天';
        ccInput.dispatchEvent(new Event('input', { bubbles: true }));
        ccInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      // Also set the hidden CC field
      const cc = document.querySelector('#BugCc');
      if (cc) {
        cc.value = '周以天;';
        cc.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    console.log('CC set');

    // 5. Description
    await page.evaluate(() => {
      const desc = document.querySelector('#BugDescription');
      if (desc) {
        desc.value = '通行证奖励预览中，卡牌描述文本显示错误，请参考截图。\n\n需要检查通行证奖励预览界面的卡牌描述数据来源，修复描述文本。';
        desc.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    console.log('Description set');

    // 6. Upload attachment
    const attachmentPath = 'C:\\Users\\yyzypublic\\.openclaw\\workspace\\tapd_attachment_pass_desc_bug.jpg';
    if (fs.existsSync(attachmentPath)) {
      try {
        // Click upload trigger first
        const uploadBtn = page.locator('#upload-attachement').first();
        if (await uploadBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await uploadBtn.click();
          await page.waitForTimeout(1000);
        }
        const fileInput = page.locator('#file_input').first();
        await fileInput.setInputFiles(attachmentPath);
        await page.waitForTimeout(6000);
        console.log('Attachment uploaded');
      } catch (e) {
        console.log('Upload error:', e.message);
      }
    }

    // 7. Submit - Click #_view (visible "创建" button)
    await page.waitForTimeout(1000);
    
    console.log('Clicking submit button #_view...');
    await page.click('#_view');
    await page.waitForTimeout(5000);

    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);
    
    if (finalUrl.includes('bugtrace/bugs/add')) {
      // Check for validation errors
      const errors = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.error, .alert, .alert-error, [class*=error]'))
          .map(e => e.textContent.trim())
          .filter(Boolean);
      });
      console.log('Form errors:', errors);
      await page.screenshot({ path: 'bug_create_fail.png', fullPage: true });
      console.log('ERROR: Bug creation failed, screenshot saved');
    } else {
      console.log('SUCCESS: Bug created! URL:', finalUrl);
    }
    
    return finalUrl;
  } finally {
    await browser.close();
  }
}

main().catch(e => {
  console.error('Failed:', e.message);
  process.exit(1);
});
