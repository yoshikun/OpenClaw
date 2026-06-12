import { chromium } from 'playwright';
import fs from 'fs';

const COOKIES_FILE = 'tapd_cookies.json';

// Preset items for client-side requirements: only 客户端, 策划, QA
// Template presets: which preset indexes to keep, and their owners
const TEMPLATES = {
  client: {  // 1V1客户端开单模版
    name: '客户端开单',
    keepIndexes: [12, 14, 16], // 客户端, 策划, QA
    owners: { 12: '叶枝君;', 14: '赵乾;', 16: '周以天;' },
    handler: '叶枝君',
  },
  server: {  // 1V1服务端开单模版
    name: '服务端开单',
    keepIndexes: [13, 14, 16], // 服务端, 策划, QA
    owners: { 13: '陈霄豪;', 14: '赵乾;', 16: '周以天;' },
    handler: '陈霄豪',
  },
  design: {  // 1V1策划需求单模版
    name: '策划需求单',
    keepIndexes: [14, 16, 12, 13], // 策划, QA, 客户端, 服务端
    owners: { 14: '赵乾;', 16: '周以天;', 12: '叶枝君;', 13: '黄佳瑞;' },
    handler: '赵乾',
  },
  ui: {  // 1V1UI需求单模版
    name: 'UI需求单',
    keepIndexes: [7, 8, 12, 14, 16], // UI, UI验收, 客户端, 策划, QA
    owners: { 7: '小冰;', 8: '小冰;', 12: '叶枝君;', 14: '赵乾;', 16: '周以天;' },
    handler: '小冰',
  },
  motion: {  // 动作需求单模版
    name: '动作需求单',
    keepIndexes: [2, 3, 9, 10, 14, 16], // 2D动作, 3D动作, 动效, 动效验收, 策划, QA
    owners: { 2: '江林;王晓松;', 3: '樊荣;', 9: '肖和;', 10: '肖和;', 14: '赵乾;', 16: '周以天;' },
    handler: '肖和',
  },
  audio: {  // 音频需求单模版
    name: '音频需求单',
    keepIndexes: [11, 14, 16], // 音频, 策划, QA
    owners: { 11: '吴美霞;傅一然;', 14: '赵乾;', 16: '周以天;' },
    handler: '吴美霞',
  },
};

const DEFAULT_TEMPLATE = 'client';

async function createStory(options) {
  const templateKey = options.template || DEFAULT_TEMPLATE;
  const tpl = TEMPLATES[templateKey] || TEMPLATES[DEFAULT_TEMPLATE];

  const {
    title,
    module = '1V1',
    version = '【1V1】正式版本V2.0',
    priority = 'P2',
    handler = tpl.handler,
    cc = '周以天',
    presetIndexes = tpl.keepIndexes,
  } = options;

  const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));

  let headless = true;
  let retry = false;

  do {
    retry = false;
    const browser = await chromium.launch({
      headless,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
    });
    const ctx = await browser.newContext({
      locale: 'zh-CN',
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36',
    });
    await ctx.addCookies(cookies);
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      delete navigator.webdriver;
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh'] });
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
      window.chrome = { runtime: {} };
    });

    try {
      await page.goto('https://www.tapd.cn/31253609/prong/stories/add', {
        waitUntil: 'domcontentloaded', timeout: 30000
      }).catch(e => {});
      await page.waitForTimeout(5000);

      const titleText = await page.title();
      if (titleText.includes('WAF')) {
        if (headless) {
          console.log('WAF blocked, retrying headed...');
          await browser.close();
          headless = false;
          retry = true;
          continue;
        }
        throw new Error('WAF blocked');
      }

      // Configure preset items via dialog
      // Map preset indexes to names for the dialog
      const PRESET_NAMES = ['原画草稿','原画完成稿','2D动作','3D动作','模型','特效','特效验收','UI','UI验收','动效','动效验收','音频','客户端','服务端','策划','文案','QA'];
      const KEEP_NAMES = tpl.keepIndexes.map(i => PRESET_NAMES[i]);

      // 1. Open the preset dialog
      await page.evaluate(() => {
        if (PresetTaskDialog && PresetTaskDialog.showDialog) PresetTaskDialog.showDialog();
      });
      await page.waitForTimeout(2000);

      // 2. Remove unwanted rows by name - iterate backwards to avoid index shifting
      await page.evaluate((keepNames) => {
        let removed = 0;
        // Collect rows to remove (by name input value)
        const rowsToRemove = [];
        const rows = document.querySelectorAll('.tree-row');
        rows.forEach(row => {
          const nameInput = row.querySelector('.workitem-template-name.j-row-cell--name');
          if (nameInput && !keepNames.includes(nameInput.value)) {
            rowsToRemove.push(row);
          }
        });
        // Remove in reverse (last to first) to avoid index shifting
        for (let i = rowsToRemove.length - 1; i >= 0; i--) {
          const removeBtn = rowsToRemove[i].querySelector('.j-remove-row');
          if (removeBtn) {
            removeBtn.click();
            removed++;
          }
        }
        return removed;
      }, KEEP_NAMES);
      console.log(`✅ Template: ${tpl.name} | kept: ${KEEP_NAMES.join(', ')}`);

      // 3. Save dialog - click submit
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const saveBtn = document.querySelector('.j-modify-preset-stories');
        if (saveBtn) saveBtn.click();
      });
      await page.waitForTimeout(1000);

      // 4. Wait for dialog to close
      await page.waitForTimeout(2000);

      // 5. Set preset owners from template config
      await page.evaluate((ownerConfig) => {
        const ownerInputs = document.querySelectorAll('input[name*="PresetItems"][name*="[owner]"]');
        ownerInputs.forEach(input => {
          const match = input.name.match(/\[(\d+)\]/);
          if (match) {
            const idx = parseInt(match[1]);
            if (ownerConfig[idx]) {
              input.value = ownerConfig[idx];
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        });
      }, tpl.owners);
      const ownerStrs = Object.entries(tpl.owners).map(([k,v]) => `${k}=${v.replace(';','')}`).join(', ');
      console.log(`✅ Preset owners: ${ownerStrs}`);

      // Fill form
      await page.fill('#StoryName', title);
      console.log('✅ Title:', title);

      if (module) {
        await page.selectOption('#StoryModule', module);
        console.log('✅ Module:', module);
      }
      if (version) {
        await page.selectOption('#StoryVersion', version);
        console.log('✅ Version:', version);
      }
      if (priority) {
        await page.selectOption('#StoryPriority', priority);
        console.log('✅ Priority:', priority);
      }

      // Set handler
      await page.click('#StoryOwnerValue');
      await page.waitForTimeout(300);
      await page.fill('#StoryOwnerValue', handler);
      await page.waitForTimeout(2000);

      const sugg = page.locator('.tt-suggestion').first();
      if (await sugg.isVisible().catch(() => false)) {
        await sugg.click();
        await page.waitForTimeout(1000);
        console.log('✅ Handler:', handler);
      } else {
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
        console.log('⚠️ Handler:', handler, '(no autocomplete)');
      }

      // Set CC
      if (cc) {
        await page.evaluate((name) => {
          const c = document.querySelector('#StoryCc');
          if (c) {
            c.value = name + ';';
            c.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, cc);
        console.log('✅ CC:', cc);
      }

      // Submit
      await page.waitForTimeout(500);
      await Promise.all([
        page.waitForURL('**/stories/add**', { timeout: 10000 }).catch(() => {}),
        page.waitForURL('**/story/detail**', { timeout: 10000 }).catch(() => {}),
        page.click('#btn_save_view'),
      ]);
      await page.waitForTimeout(3000);

      const resultUrl = page.url();
      console.log('\nFinal URL:', resultUrl);

      if (resultUrl.includes('story/detail')) {
        console.log('\n🎉 Story created!');
        console.log('URL:', resultUrl);
        return resultUrl;
      } else if (!resultUrl.includes('stories/add')) {
        console.log('\n🎉 Story created!');
        console.log('URL:', resultUrl);
        return resultUrl;
      } else {
        try {
          const errors = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.error,[class*=error]'))
              .map(e => e.textContent?.trim()).filter(Boolean);
          });
          console.log('⚠️ Errors:', errors.join(', ') || 'form validation error');
          return null;
        } catch {
          // Navigation happened = success
          console.log('\n🎉 Story created (navigation detected)');
          return resultUrl;
        }
      }

    } catch (e) {
      console.error('Failed:', e.message);
      return null;
    } finally {
      await browser.close();
    }
  } while (retry);
}

// CLI - run directly
if (process.argv[1] === import.meta.url || process.argv[1] === new URL(import.meta.url).pathname) {
  const title = process.argv[2];
  if (!title) {
    console.error('Usage: node create_story.mjs "Story title"');
    process.exit(1);
  }
  const template = process.argv[3] || 'client';
  createStory({ title, template }).then(url => {
    if (url) console.log('Done:', url);
    else process.exit(1);
  });
}

export { createStory };
