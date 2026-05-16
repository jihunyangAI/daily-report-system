import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

// ── 로그인 (영업사원A) ────────────────────────
await page.goto('http://localhost:5173/login');
await page.waitForLoadState('networkidle');
await page.fill('input[type="email"]', 'sales-b@test.com');
await page.fill('input[type="password"]', 'Test1234!');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard');
await page.waitForSelector('text=오늘의 보고 현황', { timeout: 10000 });
console.log('✓ 로그인 완료');

// ── 1. 오늘 보고서 작성 클릭 → 보고서 생성 후 작성 화면으로 이동 ──
await page.click('text=오늘 보고서 작성하기');
await page.waitForURL('**/edit', { timeout: 10000 });
await page.waitForSelector('text=일일보고', { timeout: 8000 });
await page.waitForTimeout(500);
await page.screenshot({ path: 'scripts/08-report-form-empty.png' });
console.log('✓ 08-report-form-empty.png (빈 작성 폼)');

// ── 2. 방문기록 행 추가 ──────────────────────
await page.click('text=+ 행 추가');
await page.waitForTimeout(400);
await page.screenshot({ path: 'scripts/09-report-form-visit-added.png' });
console.log('✓ 09-report-form-visit-added.png (방문기록 행 추가)');

// ── 3. 고객 검색 ─────────────────────────────
const visitCustomerInput = page.locator('input[placeholder="고객명으로 검색"]').first();
await visitCustomerInput.click();
await visitCustomerInput.fill('테스트');
await page.waitForTimeout(800);
await page.screenshot({ path: 'scripts/10-report-form-customer-search.png' });
console.log('✓ 10-report-form-customer-search.png (고객 검색)');

// ── 4. 고객 선택 ─────────────────────────────
await page.click('text=(주)테스트산업');
await page.waitForTimeout(300);

// 방문 시각·목적·내용 입력
await page.locator('input[type="time"]').first().fill('10:00');
// 방문목적: label "방문목적" 다음 input
const visitPurposeInput = page.locator('label', { hasText: '방문목적' }).locator('..').locator('input');
await visitPurposeInput.fill('신제품 데모 및 소개');
// 방문내용: 방문기록 섹션의 textarea
await page.locator('section').filter({ hasText: '방문기록' }).locator('textarea').first().fill('신제품 기능 시연 완료. 고객 반응 매우 긍정적. 다음 주 추가 미팅 예정.');

// ── 5. 과제/상담 행 추가 및 입력 ─────────────
await page.locator('text=+ 행 추가').nth(1).click();
await page.waitForTimeout(300);
const problemTextarea = page.locator('section').filter({ hasText: '과제/상담' }).locator('textarea').first();
await problemTextarea.fill('A사 계약 조건 내부 법무 검토 필요 (납기 일정 조율 포함)');

// ── 6. 익일계획 행 추가 및 입력 ─────────────
await page.locator('text=+ 행 추가').nth(2).click();
await page.waitForTimeout(300);
const planTextarea = page.locator('section').filter({ hasText: '익일계획' }).locator('textarea').first();
await planTextarea.fill('B사 신규 방문 (오전 10시, 제안서 지참)');

await page.waitForTimeout(300);
await page.screenshot({ path: 'scripts/11-report-form-filled.png' });
console.log('✓ 11-report-form-filled.png (작성 완료 상태)');

// ── 7. 임시저장 ──────────────────────────────
page.on('dialog', async dialog => {
  console.log(`  Dialog: ${dialog.message()}`);
  await dialog.accept();
});
await page.click('text=임시저장');
await page.waitForTimeout(1500);
await page.screenshot({ path: 'scripts/12-report-form-saved.png' });
console.log('✓ 12-report-form-saved.png (임시저장 완료)');

// ── 8. 제출 ──────────────────────────────────
await page.click('text=제출');
await page.waitForTimeout(2000);
// 제출 성공 시 상세 화면으로 이동
const url = page.url();
if (url.includes('/report/') && !url.includes('/edit')) {
  await page.waitForSelector('text=일일보고 상세', { timeout: 8000 });
  await page.screenshot({ path: 'scripts/13-report-detail-submitted.png' });
  console.log('✓ 13-report-detail-submitted.png (제출 후 상세 화면)');
} else {
  await page.screenshot({ path: 'scripts/13-report-detail-submitted.png' });
  console.log('✓ 13-report-detail-submitted.png (제출 결과)');
}

await browser.close();
console.log('\n보고서 작성 화면 스크린샷 완료!');
