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

  // Fill all fields
  await page.fill('#BugTitle', 'Test bug - please ignore');
  await page.selectOption('#BugVersionReport', '【1V1】正式版本V4.0');
  await page.selectOption('#BugPriority', 'P2');
  await page.selectOption('#BugModule', '1V1');
  await page.selectOption('#BugCustomFieldOne', 'YZY_1V1 V1.0 Beta');

  // Debug the handler input structure
  const handlerInfo = await page.evaluate(() => {
    const inputs = document.querySelectorAll('#BugCurrentOwnerValue');
    const info = [];
    inputs.forEach((el, i) => {
      info.push({
        index: i,
        tag: el.tagName,
        type: el.type,
        class: el.className,
        id: el.id,
        visible: el.offsetParent !== null,
        value: el.value,
        placeholder: el.placeholder,
        parent_class: el.parentElement ? el.parentElement.className : '',
        parent_html: el.parentElement ? el.parentElement.outerHTML.substring(0, 300) : ''
      });
    });

    // Check autocomplete-related elements
    const suggestions = document.querySelectorAll('.tt-suggestion');
    const suggestionHtml = Array.from(suggestions).map(s => s.outerHTML.substring(0, 200));

    // Check for typeahead/twitter bootstrap typeahead
    const dropdown = document.querySelectorAll('.tt-dropdown-menu, .tt-menu');
    const dropdownHtml = Array.from(dropdown).map(d => d.outerHTML.substring(0, 200));

    // Check for hidden owner field
    const bugOwner = document.querySelectorAll('#BugCurrentOwner');
    const ownerInfo = Array.from(bugOwner).map(el => ({
      tag: el.tagName,
      type: el.type,
      value: el.value,
      visible: el.offsetParent !== null,
      html: el.outerHTML.substring(0, 200)
    }));

    return { info, suggestionHtml, dropdownHtml, ownerInfo };
  });

  console.log('Handler inputs:');
  console.log(JSON.stringify(handlerInfo, null, 2));

  // Now try to interact with the handler field
  const ownerInput = page.locator('#BugCurrentOwnerValue').first();
  await ownerInput.click();
  await page.waitForTimeout(500);
  
  // Type character by character and check for suggestions
  const chars = '赵';
  for (const ch of chars) {
    await page.keyboard.type(ch, { delay: 200 });
    await page.waitForTimeout(500);
    
    // Check if any dropdown appeared
    const state = await page.evaluate(() => {
      const dropdowns = document.querySelectorAll('.tt-dropdown-menu, .tt-menu, .tt-suggestion, [class*=suggestion]');
      const typeaheadInputs = document.querySelectorAll('.tt-input');
      return {
        dropdownCount: dropdowns.length,
        dropdownHtml: Array.from(dropdowns).slice(0, 5).map(d => d.outerHTML.substring(0, 200)),
        typeaheadCount: typeaheadInputs.length,
        typeaheadValues: Array.from(typeaheadInputs).map(t => t.value),
        activeElement: document.activeElement ? document.activeElement.id || document.activeElement.className : 'none'
      };
    });
    console.log('After typing "' + ch + '":', JSON.stringify(state, null, 2));
  }

  await page.waitForTimeout(2000);
  
  // Final check
  const finalState = await page.evaluate(() => {
    // Check all hidden form fields
    const allInputs = document.querySelectorAll('input[type=hidden]');
    const hiddenInfo = {};
    allInputs.forEach(el => {
      if (el.id) hiddenInfo[el.id] = el.value;
    });
    
    // Check if there's a typeahead instance
    const typeaheadData = window.$ ? window.$('#BugCurrentOwnerValue').data('ttTypeahead') : null;
    
    return {
      hiddenFields: hiddenInfo,
      typeaheadInstance: !!typeaheadData,
      handlerValue: document.querySelector('#BugCurrentOwnerValue')?.value || '',
      handlerHiddenValue: document.querySelector('#BugCurrentOwner')?.value || ''
    };
  });
  console.log('Final state:', JSON.stringify(finalState, null, 2));

  await page.screenshot({ path: 'debug_handler.png', fullPage: true });
  console.log('Screenshot saved');

  await browser.close();
}
debug().catch(e => { console.error('Error:', e.message); process.exit(1); });
