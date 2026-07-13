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
    // 1. Open bug create page
    const url = `https://www.tapd.cn/${WORKSPACE_ID}/bugtrace/bugs/add`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(5000);

    const currentUrl = page.url();
    const pageTitle = await page.title();
    console.log('Page URL:', currentUrl);
    console.log('Page title:', pageTitle);

    if (pageTitle.includes('WAF')) throw new Error('WAF blocked');
    if (currentUrl.includes('login') || pageTitle.includes('登录')) throw new Error('Cookies expired');

    // 2. Fill basic fields
    await page.fill('#BugTitle', '【通行证】获得卡牌描述文本错误');
    console.log('Title filled');

    await page.selectOption('#BugVersionReport', '【1V1】正式版本V4.0');
    await page.selectOption('#BugPriority', 'P2');
    await page.selectOption('#BugModule', '1V1');
    await page.selectOption('#BugCustomFieldOne', 'YZY_1V1 V1.0 Beta');
    console.log('Select fields done');

    // 3. Set handler - "赵乾" not found in TAPD autocomplete, so set both visible and hidden fields via JS
    const handlerVisible = page.locator('#BugCurrentOwnerValue').first();
    await handlerVisible.click();
    await page.waitForTimeout(300);
    
    await page.evaluate(() => {
      // Set the visible text field
      const visibleInput = document.querySelector('#BugCurrentOwnerValue');
      if (visibleInput) {
        visibleInput.value = '赵乾';
        visibleInput.dispatchEvent(new Event('input', { bubbles: true }));
        visibleInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      // Set the hidden field that stores the actual user ID/name
      const hiddenInput = document.querySelector('#BugCurrentOwner');
      if (hiddenInput) {
        hiddenInput.value = '赵乾';
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    console.log('Handler set to 赵乾 via JS');
    await page.waitForTimeout(500);

    // 4. CC - 周以天
    await page.evaluate(() => {
      const ccValue = document.querySelector('#BugCcValue');
      if (ccValue) {
        ccValue.value = '周以天';
        ccValue.dispatchEvent(new Event('input', { bubbles: true }));
        ccValue.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const cc = document.querySelector('#BugCc');
      if (cc) {
        cc.value = '周以天;';
        cc.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    console.log('CC set');

    // 5. Description
    await page.evaluate(() => {
      const d = document.querySelector('#BugDescription');
      if (d) {
        d.value = '通行证奖励预览中，卡牌描述文本显示错误，请参考截图。\n\n需要检查通行证奖励预览界面的卡牌描述数据来源，修复描述文本。';
        d.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // 6. Upload attachment
    const attachmentPath = 'C:\\Users\\yyzypublic\\.openclaw\\workspace\\tapd_attachment_pass_desc_bug.jpg';
    if (fs.existsSync(attachmentPath)) {
      try {
        const uploadBtn = page.locator('#upload-attachement').first();
        if (await uploadBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await uploadBtn.click();
          await page.waitForTimeout(1000);
        }
        await page.locator('#file_input').first().setInputFiles(attachmentPath);
        await page.waitForTimeout(6000);
        console.log('Attachment uploaded');
      } catch (e) {
        console.log('Upload error:', e.message);
      }
    }

    // 7. Submit - click #_view (visible)
    await page.waitForTimeout(1000);
    console.log('Clicking #_view submit button...');
    await page.click('#_view');
    await page.waitForTimeout(5000);

    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);

    if (!finalUrl.includes('bugtrace/bugs/add')) {
      console.log('SUCCESS: Bug created! URL:', finalUrl);
      return finalUrl;
    } else {
      // Form might have validation errors, try submit_and_continue as fallback
      console.log('#_view did not redirect, trying #submit_and_continue...');
      await page.click('#submit_and_continue');
      await page.waitForTimeout(5000);
      
      const finalUrl2 = page.url();
      console.log('Final URL after submit_and_continue:', finalUrl2);
      
      if (!finalUrl2.includes('bugtrace/bugs/add')) {
        console.log('SUCCESS: Bug created with submit_and_continue! URL:', finalUrl2);
        return finalUrl2;
      } else {
        // Check for validation errors
        const errors = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('.error, .alert, .alert-error, [class*=error], .help-inline, .help-block'))
            .map(e => e.textContent.trim())
            .filter(Boolean);
        });
        console.log('Form errors:', errors);
        
        // Dump current form state
        const formState = await page.evaluate(() => {
          const fields = {};
          document.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.id) fields[el.id] = el.value;
          });
          return fields;
        });
        console.log('Form state:', JSON.stringify(formState, null, 2));
        
        await page.screenshot({ path: 'bug_create_fail.png', fullPage: true });
        console.log('ERROR: Bug creation failed, screenshot saved');
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch(e => {
  console.error('Failed:', e.message);
  process.exit(1);
});
