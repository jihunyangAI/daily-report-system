import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

// ── 1. 로그인 페이지 ──────────────────────────
await page.goto('http://localhost:5173/login');
await page.waitForLoadState('networkidle');
await page.screenshot({ path: 'scripts/01-login.png' });
console.log('✓ 01-login.png');

// ── 2. 로그인 (영업사원A) ─────────────────────
await page.fill('input[type="email"]', 'sales-a@test.com');
await page.fill('input[type="password"]', 'Test1234!');
await page.screenshot({ path: 'scripts/02-login-filled.png' });
console.log('✓ 02-login-filled.png');

await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard');
await page.waitForSelector('text=오늘의 보고 현황', { timeout: 10000 });
await page.screenshot({ path: 'scripts/03-dashboard-sales.png' });
console.log('✓ 03-dashboard-sales.png (영업사원 대시보드)');

// ── 3. 나의 보고서 목록 ───────────────────────
await page.click('text=나의 보고');
await page.waitForSelector('text=나의 일일보고 목록', { timeout: 8000 });
await page.screenshot({ path: 'scripts/04-my-reports.png' });
console.log('✓ 04-my-reports.png');

// ── 4. 로그아웃 후 팀장으로 로그인 ───────────
await page.click('text=로그아웃');
await page.waitForURL('**/login');

await page.fill('input[type="email"]', 'manager@test.com');
await page.fill('input[type="password"]', 'Test1234!');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard');
await page.waitForSelector('text=오늘의 보고 현황', { timeout: 10000 });
await page.screenshot({ path: 'scripts/05-dashboard-manager.png' });
console.log('✓ 05-dashboard-manager.png (팀장 대시보드)');

// ── 5. 팀 보고서 목록 ─────────────────────────
await page.click('text=팀 보고');
await page.waitForSelector('text=팀 일일보고 목록', { timeout: 8000 });
await page.screenshot({ path: 'scripts/06-team-reports.png' });
console.log('✓ 06-team-reports.png');

// ── 6. 고객 목록 ──────────────────────────────
await page.click('text=고객관리');
await page.waitForSelector('text=고객 마스터', { timeout: 8000 });
await page.screenshot({ path: 'scripts/07-customers.png' });
console.log('✓ 07-customers.png');

await browser.close();
console.log('\n모든 스크린샷 완료!');
