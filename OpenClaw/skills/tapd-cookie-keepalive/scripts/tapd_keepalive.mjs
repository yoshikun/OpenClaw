#!/usr/bin/env node
/**
 * TAPD Cookie Keepalive
 * 
 * Visits TAPD with saved cookies to keep the session alive.
 * If cookies are expired, exits with code 1 so cron can trigger re-login.
 * If cookies are valid, saves refreshed cookies and exits with code 0.
 * 
 * Usage:
 *   node tapd_keepalive.mjs          # Check and refresh cookies
 *   node tapd_keepalive.mjs --login  # Launch headed login (fallback)
 * 
 * Exit codes:
 *   0 = OK, cookies refreshed
 *   1 = Cookies expired, user needs to re-login
 *   2 = No cookies file found
 *   3 = WAF blocked (headless not viable)
 *   4 = Unexpected error
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
const WORKSPACE_ID = '31253609';

const STEALTH_INIT = () => {
  delete navigator.webdriver;
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh'] });
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
  window.chrome = { runtime: {}, loadTimes: function(){}, csi: function(){}, app: {} };
};

async function checkAndRefreshCookies() {
  if (!fs.existsSync(COOKIES_FILE)) {
    console.error(`[ERROR] Cookies file not found: ${COOKIES_FILE}`);
    return 2;
  }

  let cookies;
  try {
    cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
    if (!Array.isArray(cookies) || cookies.length === 0) {
      console.error('[ERROR] Cookies file is empty or invalid');
      return 2;
    }
  } catch (e) {
    console.error('[ERROR] Failed to parse cookies file:', e.message);
    return 2;
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  const ctx = await browser.newContext({
    locale: 'zh-CN',
    viewport: { width: 1920, height: 1080 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  });

  // Fix null sameSite values — Playwright requires Strict|Lax|None
  const sanitizedCookies = cookies.map(c => ({
    ...c,
    sameSite: c.sameSite || 'Lax',
  }));
  await ctx.addCookies(sanitizedCookies);
  const page = await ctx.newPage();
  await page.addInitScript(STEALTH_INIT);

  try {
    const url = `https://www.tapd.cn/${WORKSPACE_ID}`;
    console.log(`[INFO] Visiting ${url} ...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(5000);

    const currentUrl = page.url();
    const pageTitle = await page.title();

    console.log(`[INFO] Current URL: ${currentUrl}`);
    console.log(`[INFO] Page title: ${pageTitle}`);

    // Check WAF
    if (pageTitle.includes('WAF') || pageTitle.includes('Web Application Firewall')) {
      console.error('[WARN] WAF blocked headless request');
      await browser.close();
      return 3;
    }

    // Check login redirect
    if (
      currentUrl.includes('cloud_logins/login') ||
      currentUrl.includes('passport') ||
      pageTitle.includes('登录') ||
      pageTitle.includes('Login') ||
      pageTitle.includes('cloud_logins')
    ) {
      console.error('[FAIL] Cookies expired - redirected to login page');
      await browser.close();
      return 1;
    }

    // Success - save refreshed cookies
    const refreshedCookies = await ctx.cookies();
    fs.writeFileSync(COOKIES_FILE, JSON.stringify(refreshedCookies, null, 2), 'utf8');
    console.log(`[OK] Cookies refreshed (${refreshedCookies.length} cookies saved)`);

    try {
      const storageState = await ctx.storageState();
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(storageState, null, 2), 'utf8');
    } catch (_) {}

    await browser.close();
    return 0;
  } catch (err) {
    console.error(`[ERROR] Unexpected error:`, err.message);
    await browser.close();
    return 4;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--login')) {
    const loginScript = path.join(__dirname, 'tapd_login.mjs');
    const { execSync } = await import('child_process');
    execSync(`node "${loginScript}"`, { stdio: 'inherit' });
    return;
  }

  const exitCode = await checkAndRefreshCookies();

  if (exitCode === 0) {
    console.log('[OK] Keepalive successful');
  } else if (exitCode === 1) {
    console.log('[WARN] Cookies expired - login required');
  } else {
    console.error(`[FAIL] Keepalive failed with code ${exitCode}`);
  }

  process.exit(exitCode);
}

main();
