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
 * Create a TAPD bug ticket
 * @param {Object} options
 * @param {string} options.title - Bug title (required)
 * @param {string} [options.priority] - P0/P1/P2/P3
 * @param {string} [options.version] - Version report, e.g. "【1V1】正式版本V2.0"
 * @param {string} [options.module] - Module, e.g. "1V1"
 * @param {string} [options.branch] - Branch, e.g. "master"
 * @param {string} [options.handler] - Handler user ID, e.g. "1415287364"
 * @param {string} [options.description] - Bug description
 * @param {string} [options.cc] - CC user ID, e.g. "周以天;"
 * @param {string[]} [options.attachments] - Array of file paths to attach
 * @param {boolean} [options.headless] - Use headless mode (default: false for reliability)
 * @returns {Promise<string>} Created bug detail URL
 */
export async function createBug(options) {
  const { title, priority, version, module: mod, branch, handler, description, cc, attachments, headless = false } = options;
  
  if (!title) throw new Error('Bug title is required');
  
  // Load cookies
  let cookies;
  try {
    cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
  } catch (e) {
    throw new Error(`Cookies not found at ${COOKIES_FILE}. Run login flow first.`);
  }
  
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
    // Load bug create page
    const url = `https://www.tapd.cn/${WORKSPACE_ID}/bugtrace/bugs/add`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(5000);
    
    const pageTitle = await page.title();
    if (pageTitle.includes('WAF')) {
      if (headless) {
        console.log('WAF blocked in headless, retry with headless:false');
        await browser.close();
        return createBug({ ...options, headless: false });
      }
      throw new Error('WAF blocked - try again or use headed mode');
    }
    
    // Fill fields
    await page.fill('#BugTitle', title);
    if (version) await page.selectOption('#BugVersionReport', version);
    if (priority) await page.selectOption('#BugPriority', priority);
    if (mod) await page.selectOption('#BugModule', mod);
    if (branch) await page.selectOption('#BugCustomFieldOne', branch);
    
    if (handler) {
      // Use the autocomplete to set handler - TAPD expects name format not raw ID
      // handler param can be either a user ID (553342158) or a name (谭佳钦)
      const isNumericId = /^\d+$/.test(handler);
      const searchName = isNumericId ? '' : handler;
      
      if (searchName) {
        // Type name to trigger autocomplete, then select first result
        await page.click('#BugCurrentOwnerValue');
        await page.waitForTimeout(300);
        await page.fill('#BugCurrentOwnerValue', searchName);
        await page.waitForTimeout(2000);
        
        const sugg = page.locator('.tt-suggestion').first();
        if (await sugg.isVisible()) {
          await sugg.click();
          await page.waitForTimeout(1000);
        }
      }
      // If numeric ID was provided, we can't use it directly in the autocomplete
      // In that case the caller should provide the display name
    }
    
    if (cc) {
      await page.evaluate((id) => {
        const c = document.querySelector('#BugCc');
        if (c) { c.value = id; c.dispatchEvent(new Event('change', { bubbles: true })); }
      }, cc);
    }
    
    if (description) {
      await page.evaluate((desc) => {
        const d = document.querySelector('#BugDescription');
        if (d) { d.value = desc; d.dispatchEvent(new Event('input', { bubbles: true })); }
      }, description);
    }

    // Upload attachments (images)
    if (attachments && attachments.length > 0) {
      for (const filePath of attachments) {
        if (!fs.existsSync(filePath)) {
          console.log(`Warning: attachment not found: ${filePath}`);
          continue;
        }
        try {
          await page.locator('#file_input').first().setInputFiles(filePath);
          await page.waitForTimeout(3000);
          console.log(`Uploaded: ${path.basename(filePath)}`);
        } catch (e) {
          console.log(`Upload failed for ${path.basename(filePath)}: ${e.message}`);
        }
      }
    }
    
    // Submit - click the visible anchor button (#_view)
    await page.waitForTimeout(500);
    await page.click('#_view');
    
    await page.waitForTimeout(5000);
    const resultUrl = page.url();
    
    if (!resultUrl.includes('bugtrace/bugs/add')) {
      return resultUrl;
    } else {
      const errors = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.error,[class*=error]'))
          .map(e => e.textContent?.trim()).filter(Boolean);
      });
      throw new Error(`Bug creation failed: ${errors.join(', ') || 'form validation error'}`);
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
