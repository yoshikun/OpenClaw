import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_DIR = path.resolve(__dirname, '../../..');
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

/**
 * 快手提单优化版 v2
 * 
 * 优化点：
 * 1. headed 模式直接跑，不试 headless（省 3-5s 重试）
 * 2. waitForTimeout 改用 waitForSelector 精确等待
 * 3. select 填表并行跑
 * 4. 固定等待从 2000ms 砍到 ~300ms
 * 5. hidden 字段合并一次 evaluate 搞定
 * 6. 附件用 3s 超时
 * 
 * 修复提交 (v3):
 * - #_view 的 onclick 没触发 form submit（e.click() 在 SPA 中无效）
 * - 改用直接隐藏 #save_view 的 click，但先移除 form 的 jQuery submit handler（避免验证报错）
 * - 先执行 prepare 函数（add_br_in_cherry + add_description_in_form）确保描述格式化
 */
export async function createBug(options) {
  const { title, priority, version, module: mod, branch, handler, description, cc, attachments, headless = false } = options;
  
  if (!title) throw new Error('Bug title is required');
  
  const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
  
  const browser = await chromium.launch({
    headless,
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
    // 加载页面，等标题输入框出现就继续（不等全部渲染完）
    await page.goto(`https://www.tapd.cn/${WORKSPACE_ID}/bugtrace/bugs/add`, {
      waitUntil: 'load', timeout: 30000
    }).catch((err) => console.log(`Page load warning: ${err.message}`));
    await page.waitForSelector('#BugTitle', { timeout: 15000 }).catch(() => page.waitForTimeout(5000));
    await page.waitForTimeout(1500); // 等 SPA 完全渲染
    
    // === 并行填基本字段（互不依赖） ===
    await Promise.all([
      page.fill('#BugTitle', title),
      version ? page.selectOption('#BugVersionReport', version) : Promise.resolve(),
      priority ? page.selectOption('#BugPriority', priority) : Promise.resolve(),
      mod ? page.selectOption('#BugModule', mod) : Promise.resolve(),
      branch ? page.selectOption('#BugCustomFieldOne', branch) : Promise.resolve(),
      // CC + 描述用 evaluate 一次搞定
      (cc || description) ? page.evaluate(({ cc: c, desc }) => {
        if (c) {
          const ccEl = document.querySelector('#BugCc');
          if (ccEl) { ccEl.value = c; ccEl.dispatchEvent(new Event('change', { bubbles: true })); }
        }
        if (desc) {
          const descEl = document.querySelector('#BugDescription');
          if (descEl) { descEl.value = desc; descEl.dispatchEvent(new Event('input', { bubbles: true })); }
        }
      }, { cc, desc: description }) : Promise.resolve(),
    ]);
    
    // === 处理人（自动补全，只能串行） ===
    if (handler) {
      const isNumericId = /^\d+$/.test(handler);
      if (!isNumericId) {
        const ownerInput = page.locator('#BugCurrentOwnerValue').first();
        await ownerInput.click();
        await ownerInput.fill(handler);
        // 精确等自动补全出现，不等固定时间
        const sugg = page.locator('.tt-suggestion').first();
        try {
          await sugg.waitFor({ state: 'visible', timeout: 3000 });
          await sugg.click();
        } catch {
          // 没搜到人，按 Enter 提交当前文字
          await page.keyboard.press('Enter');
        }
        await page.waitForTimeout(300);
      }
    }
    
    // === 附件上传 ===
    if (attachments && attachments.length > 0) {
      // 先触发"添加"按钮显示 file_input
      try {
        const uploadBtn = page.locator('#upload-attachement').first();
        if (await uploadBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await uploadBtn.click();
          await page.waitForTimeout(500);
        }
      } catch { /* ignore */ }
      
      for (const filePath of attachments) {
        if (!fs.existsSync(filePath)) continue;
        try {
          await page.locator('#file_input').first().setInputFiles(filePath);
          // 等 3s 够上传了（之前 6s）
          await page.waitForTimeout(3000);
        } catch (e) {
          console.log(`Upload fail: ${path.basename(filePath)} - ${e.message}`);
        }
      }
    }
    
    // === 提交（修复版 v3） ===
    // 先执行准备函数确保描述等数据写入 form
    await page.evaluate(() => {
      if (typeof add_br_in_cherry === 'function') add_br_in_cherry();
      if (typeof add_description_in_form === 'function') add_description_in_form();
    });
    await page.waitForTimeout(300);
    
    // 移除 form 的 jQuery submit 事件处理（避免验证报错）
    const submitResult = await page.evaluate(() => {
      const form = document.querySelector('#bug_form');
      if (!form) return 'no form';
      const formEvents = window.jQuery._data(form, 'events');
      if (formEvents && formEvents.submit) delete formEvents.submit;
      // 点击 save_view (提交&查看) 触发原生 form submit
      const sv = document.getElementById('save_view');
      if (sv) { sv.click(); return 'clicked save_view'; }
      return 'no save_view';
    });
    console.log(`Submit: ${submitResult}`);
    
    // 等跳转（最多 20s）—— 用 waitForNavigation 更可靠
    let resultUrl = page.url();
    try {
      const nav = await page.waitForNavigation({ timeout: 20000 });
      resultUrl = nav.url();
      console.log(`Navigated to: ${resultUrl}`);
    } catch {
      console.log('No navigation detected within timeout, checking current URL...');
      await page.waitForTimeout(2000);
      resultUrl = page.url();
    }
    
    // 如果还在 add 页面，可能还没完成跳转，再等一下
    if (resultUrl.includes('bugtrace/bugs/add')) {
      await page.waitForTimeout(5000);
      resultUrl = page.url();
    }
    
    if (!resultUrl.includes('bugtrace/bugs/add')) {
      return resultUrl;
    } else {
      const errors = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.field-error, .error, .alert-error, .help-inline'))
          .map(e => e.textContent?.trim()).filter(Boolean);
      });
      await page.screenshot({ path: 'bug_create_fail.png' }).catch(() => {});
      throw new Error(`Bug creation failed: ${errors.join(', ') || 'unknown error (still on add page)'}`);
    }
  } finally {
    await browser.close();
  }
}

// CLI support
if (process.argv[1] === __filename) {
  const args = {};
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i].replace(/^--/, '');
    args[key] = process.argv[i + 1];
  }
  
  createBug(args).then(url => {
    console.log('Bug created:', url);
    process.exit(0);
  }).catch(e => {
    console.error('Failed:', e.message);
    process.exit(1);
  });
}
