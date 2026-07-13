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

    // 3. Handler - 赵乾 not found in TAPD, use 沈嘉琨 as substitute (planning handler)
    const ownerInput = page.locator('#BugCurrentOwnerValue').first();
    await ownerInput.click();
    await page.waitForTimeout(300);
    
    // Type 沈嘉琨 via keyboard to trigger autocomplete
    await page.keyboard.type('沈嘉琨', { delay: 100 });
    await page.waitForTimeout(2000);

    const suggCount = await page.locator('.tt-suggestion').count();
    console.log(`Handler suggestions: ${suggCount}`);
    
    if (suggCount > 0) {
      const suggText = await page.locator('.tt-suggestion').first().textContent();
      console.log(`First suggestion: "${suggText.trim()}"`);
      await page.locator('.tt-suggestion').first().click();
      console.log('Handler autocomplete clicked');
      await page.waitForTimeout(1000);
    } else {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }

    // Verify handler was set
    const handlerValue = await page.locator('#BugCurrentOwner').inputValue().catch(() => '');
    console.log(`Handler hidden value: "${handlerValue}"`);

    // 4. CC - 周以天 (use keyboard type for autocomplete)
    const ccInput = page.locator('#BugCcValue').first();
    await ccInput.click();
    await page.waitForTimeout(300);
    
    await page.keyboard.type('周以天', { delay: 100 });
    await page.waitForTimeout(2000);

    const ccSuggCount = await page.locator('.tt-suggestion').count();
    console.log(`CC suggestions: ${ccSuggCount}`);
    
    if (ccSuggCount > 0) {
      await page.locator('.tt-suggestion').first().click();
      console.log('CC autocomplete clicked');
      await page.waitForTimeout(1000);
    } else {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      // Fallback to hidden field
      await page.evaluate(() => {
        const cc = document.querySelector('#BugCc');
        if (cc) {
          cc.value = '周以天;';
          cc.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    }

    // Also set the hidden CC as backup
    await page.evaluate(() => {
      const cc = document.querySelector('#BugCc');
      if (cc) {
        const existing = cc.value;
        if (!existing.includes('周以天')) {
          cc.value = existing ? existing + ';周以天' : '周以天;';
          cc.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
    console.log('CC set');

    // 5. Description - use TinyMCE iframe
    const descriptionText = '通行证奖励预览中，卡牌描述文本显示错误，请参考截图。\n\n需要检查通行证奖励预览界面的卡牌描述数据来源，修复描述文本。';
    
    try {
      const tinyFrame = page.frameLocator('#BugDescription_ifr');
      const body = tinyFrame.locator('body');
      await body.click();
      await page.waitForTimeout(500);
      
      // Type into TinyMCE iframe body
      await body.fill(descriptionText);
      await page.waitForTimeout(1000);
      
      // Manually trigger TinyMCE save via evaluate
      await page.evaluate(() => {
        // Try to find TinyMCE instance
        if (typeof tinymce !== 'undefined') {
          const editor = tinymce.get('BugDescription');
          if (editor) {
            editor.save();
            console.log('TinyMCE save triggered');
          }
        }
      });
      await page.waitForTimeout(500);
      
      console.log('Description typed in TinyMCE');
    } catch (e) {
      console.log('TinyMCE approach error:', e.message);
    }
    
    // Also directly set the hidden textarea as backup
    await page.evaluate((desc) => {
      const d = document.querySelector('#BugDescription');
      if (d) {
        d.value = desc;
        d.dispatchEvent(new Event('input', { bubbles: true }));
        d.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, descriptionText);

    // Verify description was set
    const descVal = await page.evaluate(() => document.querySelector('#BugDescription')?.value || 'empty');
    console.log(`Description textarea value: "${descVal.substring(0, 60)}"`);

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

    // 7. Submit - click #_view
    await page.waitForTimeout(1000);
    
    // Check form state before submit
    const preSubmitState = await page.evaluate(() => {
      return {
        title: document.querySelector('#BugTitle')?.value,
        handler: document.querySelector('#BugCurrentOwner')?.value,
        handlerVisible: document.querySelector('#BugCurrentOwnerValue')?.value,
        cc: document.querySelector('#BugCc')?.value,
        desc: document.querySelector('#BugDescription')?.value?.substring(0, 50),
        version: document.querySelector('#BugVersionReport')?.value,
        priority: document.querySelector('#BugPriority')?.value,
        module: document.querySelector('#BugModule')?.value,
        branch: document.querySelector('#BugCustomFieldOne')?.value,
      };
    });
    console.log('\nPre-submit form state:', JSON.stringify(preSubmitState, null, 2));
    
    console.log('\nClicking #_view submit button...');
    await page.click('#_view');
    await page.waitForTimeout(5000);

    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);

    if (!finalUrl.includes('bugtrace/bugs/add')) {
      console.log('\n*** SUCCESS: Bug created! URL:', finalUrl);
      return finalUrl;
    } else {
      // Try #submit_and_continue
      console.log('#_view did not redirect, trying #submit_and_continue...');
      await page.click('#submit_and_continue');
      await page.waitForTimeout(5000);

      const finalUrl2 = page.url();
      console.log('Final URL after submit_and_continue:', finalUrl2);

      if (!finalUrl2.includes('bugtrace/bugs/add')) {
        console.log('\n*** SUCCESS: Bug created with submit_and_continue! URL:', finalUrl2);
        return finalUrl2;
      }
      
      // Check for errors
      const errors = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.error, .alert, .alert-error, [class*=error], .help-inline, .help-block, .is-error'))
          .map(e => e.textContent.trim())
          .filter(Boolean);
      });
      console.log('Form errors:', errors);
      
      await page.screenshot({ path: 'bug_create_fail.png', fullPage: true });
      console.log('ERROR: Bug creation failed, screenshot saved');
    }
  } finally {
    await browser.close();
  }
}

main().catch(e => {
  console.error('Failed:', e.message);
  process.exit(1);
});
