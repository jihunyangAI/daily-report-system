import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

// ── 팀장 로그인 ──────────────────────────────
await page.goto('http://localhost:5173/login');
await page.waitForLoadState('networkidle');
await page.fill('input[type="email"]', 'manager@test.com');
await page.fill('input[type="password"]', 'Test1234!');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard');
await page.waitForSelector('text=오늘의 보고 현황', { timeout: 10000 });
await page.screenshot({ path: 'scripts/14-manager-dashboard.png' });
console.log('✓ 14-manager-dashboard.png (팀장 대시보드 — 미제출 목록 확인)');

// ── 팀 보고서 목록 (2026-05-16 날짜로 조회) ──────
await page.click('text=팀 보고');
await page.waitForSelector('text=팀 일일보고 목록', { timeout: 8000 });
// 날짜 필터를 영업사원B 보고서 날짜(2026-05-16)로 변경
await page.fill('input[type="date"]', '2026-05-16');
await page.click('text=조회');
await page.waitForTimeout(1000);
await page.screenshot({ path: 'scripts/15-team-report-list.png' });
console.log('✓ 15-team-report-list.png (팀 보고서 목록 — 2026-05-16)');

// ── 제출완료 보고서 직접 접근 (영업사원A report ID=4) ────
await page.goto('http://localhost:5173/report/4');
await page.waitForSelector('text=일일보고 상세', { timeout: 8000 });
await page.screenshot({ path: 'scripts/16-report-detail-before-confirm.png' });
console.log('✓ 16-report-detail-before-confirm.png (확인처리 전 상세 화면)');

// ── 확인처리 버튼 클릭 ────────────────────────
page.on('dialog', async dialog => {
  console.log(`  Confirm dialog: "${dialog.message()}"`);
  await dialog.accept();
});

await page.click('text=확인처리');
await page.waitForTimeout(2000);
await page.screenshot({ path: 'scripts/17-report-detail-confirmed.png' });
console.log('✓ 17-report-detail-confirmed.png (확인처리 완료)');

// ── 팀 보고서 목록으로 돌아가 상태 확인 ────────
await page.click('text=팀 보고');
await page.waitForSelector('text=팀 일일보고 목록', { timeout: 8000 });
await page.waitForTimeout(800);
await page.screenshot({ path: 'scripts/18-team-report-after-confirm.png' });
console.log('✓ 18-team-report-after-confirm.png (확인처리 후 팀 목록)');

await browser.close();
console.log('\n확인처리 스크린샷 완료!');
