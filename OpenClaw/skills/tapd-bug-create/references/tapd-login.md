# TAPD Login Flow

TAPD uses Tencent Cloud WAF and requires login via:

1. WeChat QR scan (微信扫码) - Headed browser required
2. SMS verification code (手机验证码)
3. Email + Password (邮箱密码)

## Cookie Management

Login cookies are stored in `workspace/tapd_cookies.json`. Storage state is in `workspace/tapd_storage.json`.

## Login via WeChat QR (Recommended)

```mjs
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await (await browser.newContext()).newPage();
await page.goto('https://www.tapd.cn/cloud_logins/login');

// Click wechat auth
await page.click('a[href*="wx/auth"]');
// QR code appears on screen - scan with phone WeChat
// Wait for login redirect...
```

## Login via SMS Code

```mjs
// Step 1: Send code
// Navigate, click SMS tab, fill phone, click send
// Step 2: Enter code
// Get code from user, fill, submit
```

## Key Points

- Stealth init script is required for headless mode WAF bypass
- Headed mode (`headless: false`) always works
- After login, save cookies with `context.cookies()` and `context.storageState()`
