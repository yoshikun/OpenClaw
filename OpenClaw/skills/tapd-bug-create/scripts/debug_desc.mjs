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

  // Check description area structure
  const descInfo = await page.evaluate(() => {
    // Find all textareas
    const textareas = document.querySelectorAll('textarea');
    const taInfo = Array.from(textareas).map(el => ({
      id: el.id,
      name: el.name,
      class: el.className,
      value: el.value.substring(0, 100),
      visible: el.offsetParent !== null,
      parent: el.parentElement ? el.parentElement.className : ''
    }));

    // Find iframe-based editors
    const iframes = document.querySelectorAll('iframe');
    const iframeInfo = Array.from(iframes).map(el => ({
      id: el.id,
      class: el.className,
      src: el.src || '(inline)',
      visible: el.offsetParent !== null
    }));

    // Look for description container
    const descContainer = document.querySelector('.jeegoocontext-html, .cke, [class*=editor], [class*=edit], .redactor-editor');
    const containerInfo = descContainer ? {
      id: descContainer.id,
      class: descContainer.className,
      html: descContainer.outerHTML.substring(0, 500)
    } : null;

    // Look for BugDescription's parent
    const bugDesc = document.querySelector('#BugDescription');
    const parentChain = bugDesc ? (() => {
      let el = bugDesc;
      const chain = [];
      for (let i = 0; i < 5 && el; i++) {
        chain.push({ tag: el.tagName, id: el.id, class: el.className });
        el = el.parentElement;
      }
      return chain;
    })() : null;

    return { textareas: taInfo, iframes: iframeInfo, containerInfo, parentChain };
  });
  
  console.log('Textareas:', JSON.stringify(descInfo.textareas, null, 2));
  console.log('Iframes:', JSON.stringify(descInfo.iframes, null, 2));
  console.log('Editor container:', JSON.stringify(descInfo.containerInfo, null, 2));
  console.log('Parent chain:', JSON.stringify(descInfo.parentChain, null, 2));

  await page.screenshot({ path: 'debug_desc.png', fullPage: true });

  await browser.close();
}
debug().catch(e => { console.error('Error:', e.message); process.exit(1); });
