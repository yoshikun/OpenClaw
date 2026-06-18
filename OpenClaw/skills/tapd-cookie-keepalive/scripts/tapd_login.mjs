#!/usr/bin/env node
/**
 * TAPD Login - Headed browser login flow
 * 
 * Launches a headed browser for the user to scan QR code and login.
 * Saves cookies to workspace/tapd_cookies.json and storage state to workspace/tapd_storage.json.
 * 
 * Usage:
 *   node tapd_login.mjs
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_DIR = path.resolve(__dirname, '../../../workspace');
const COOKIES_FILE = path.join(WORKSPACE_DIR, 'tapd_cookies.json');
const STORAGE_FILE = path.join(WORKSPACE_DIR, 'tapd_storage.json');

async function main() {
  console.log('=== TAPD Login ===');
  console.log(`Cookies will be saved to: ${COOKIES_FILE}`);
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  const ctx = await browser.newContext({
    locale: 'zh-CN',
    viewport: { width: 1280, height: 800 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  });

  const page = await ctx.newPage();

  try {
    console.log('Opening TAPD login page...');
    await page.goto('https://www.tapd.cn/cloud_logins/login', {
      waitUntil: 'networkidle',
    });

    // Click WeChat auth button
    const wxBtn = page.locator('a[href*="wx/auth"]');
    if (await wxBtn.isVisible()) {
      await wxBtn.click();
      console.log('WeChat QR code should now be visible.');
    } else {
      // Maybe already on QR page, or need to click SMS tab then switch
      console.log('Navigating to WeChat auth...');
      await page.goto('https://www.tapd.cn/cloud_logins/login?type=wechat', {
        waitUntil: 'networkidle',
      });
    }

    console.log('');
    console.log('=== Please scan the QR code with WeChat ===');
    console.log('Waiting for login...');

    // Wait for redirect to main page (URL changes away from login)
    await page.waitForURL(
      (url) => !url.href.includes('cloud_logins/login') && url.href.includes('tapd.cn'),
      { timeout: 120000 }
    );

    console.log('Login detected! Saving cookies...');

    // Save cookies
    const cookies = await ctx.cookies();
    fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2), 'utf8');
    console.log(`[OK] Cookies saved to ${COOKIES_FILE}`);

    // Save storage state
    const storageState = await ctx.storageState();
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(storageState, null, 2), 'utf8');
    console.log(`[OK] Storage state saved to ${STORAGE_FILE}`);

    console.log('');
    console.log('=== Login complete! ===');
    console.log('TAPD keepalive cron is now ready to run.');

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Login failed:', err.message);
    console.log('Closing browser...');
    await browser.close();
    process.exit(1);
  }
}

main();
