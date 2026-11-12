import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { Question } from '../src/models/types';
import { fixtureWorkbook } from '../tests/fixtures/workbook';

test.beforeEach(async ({ page, context }) => {
  await context.route('https://sheets.googleapis.com/**', (route) => {
    expect(route.request().method()).toBe('GET');
    return route.fulfill({ json: fixtureWorkbook() });
  });
  await page.addInitScript(() => {
    (window as any).__storageWrites = [];
    const record = (name: string) => {
      (window as any).__storageWrites.push(name);
      throw new Error(`Unexpected persistence: ${name}`);
    };
    Storage.prototype.setItem = function () {
      record('Storage.setItem');
    };
    indexedDB.open = function () {
      record('indexedDB.open');
      return undefined as any;
    };
  });
});
async function clean(page: Page) {
  expect(await page.evaluate(() => (window as any).__storageWrites)).toEqual([]);
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
      cookie: document.cookie,
    })),
  ).toEqual({ local: 0, session: 0, cookie: '' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}
test('static collections, keyboard flip/grading/shuffle, reload and new tab reset', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.locator('.titlebar').getByRole('link', { name: 'Subjects', exact: true })).toHaveCount(0);
  await expect(page.locator('.subject-card').filter({ hasText: 'Database Systems' }).locator('.course-id')).toHaveText(
    'DBI202',
  );
  await expect(page.locator('.subject-card').filter({ hasText: 'Java Programming' }).locator('.course-id')).toHaveText(
    'PRO192',
  );
  await expect(page.locator('.subject-card')).toHaveCount(8);
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(page.locator('.subject-hero')).toHaveCount(0);
  await page.getByLabel('Học kỳ', { exact: true }).selectOption('3');
  await expect(page.locator('.subject-card')).toHaveCount(1);
  await expect(page.locator('.subject-code')).toHaveText('Kỳ 3');
  await page.getByLabel('Học kỳ', { exact: true }).selectOption('');
  await page.locator('.subject-card').filter({ hasText: 'Geography' }).click();
  await page.getByRole('link', { name: /World geography/ }).click();
  await expect(page.locator('.study-counter')).toContainText('Còn 11 thẻ cần ôn · Đã nhớ 0 / 11');
  await page.keyboard.press('f');
  await expect(page.locator('.card-side')).toHaveText('ĐÁP ÁN');
  await page.keyboard.press('1');
  await expect(page.locator('.study-counter')).toContainText('Còn 11 thẻ cần ôn · Đã nhớ 0 / 11');
  await expect(page.locator('.card-side')).toHaveText('CÂU HỎI');
  await page.keyboard.press('s');
  await expect(page.locator('.study-counter')).toContainText('Còn 11 thẻ cần ôn · Đã nhớ 0 / 11');
  await page.keyboard.press('2');
  await expect(page.locator('.study-counter')).toContainText('Còn 10 thẻ cần ôn · Đã nhớ 1 / 11');
  await page.reload();
  await expect(page.locator('.study-counter')).toContainText('Còn 11 thẻ cần ôn · Đã nhớ 0 / 11');
  await expect(page.locator('.card-side')).toHaveText('CÂU HỎI');
  await clean(page);
  const url = page.url();
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto(url);
  await expect(reopened.locator('.study-counter')).toContainText('Còn 11 thẻ cần ôn · Đã nhớ 0 / 11');
});
test('flashcard review loop recycles unknown cards and ends with a summary', async ({ page }) => {
  await page.goto('/#/subjects/database/deck/flashcards-database-sql');
  await expect(page.locator('.study-counter')).toContainText('Còn 3 thẻ cần ôn · Đã nhớ 0 / 3');
  await expect(page.locator('.flashcard-text')).toHaveText('Which clause filters rows before grouping?');
  await page.locator('.study-controls').getByRole('button', { name: 'Chưa nhớ' }).click();
  await expect(page.locator('.study-counter')).toContainText('Còn 3 thẻ cần ôn · Đã nhớ 0 / 3');
  await page.locator('.study-controls').getByRole('button', { name: 'Đã nhớ' }).click();
  await expect(page.locator('.study-counter')).toContainText('Còn 2 thẻ cần ôn · Đã nhớ 1 / 3');
  await page.locator('.study-controls').getByRole('button', { name: 'Đã nhớ' }).click();
  await expect(page.locator('.study-counter')).toContainText('Còn 1 thẻ cần ôn · Đã nhớ 2 / 3');
  await expect(page.locator('.flashcard-text')).toHaveText('Which clause filters rows before grouping?');
  await page.locator('.study-controls').getByRole('button', { name: 'Đã nhớ' }).click();
  await expect(page.getByRole('heading', { name: 'Hoàn thành!' })).toBeVisible();
  await expect(page.locator('.study-summary-stats')).toContainText('Lượt “chưa nhớ”1');
  await page.locator('.study-controls').getByRole('button', { name: 'Học lại từ đầu' }).click();
  await expect(page.locator('.study-counter')).toContainText('Còn 3 thẻ cần ôn · Đã nhớ 0 / 3');
  await expect(page.locator('.flashcard-text')).toHaveText('Which clause filters rows before grouping?');
  await clean(page);
});

test('session banner appears once on every route without a dismiss control', async ({ page }) => {
  const routes = [
    '/',
    '/#/subjects',
    '/#/subjects/geography/flashcards',
    '/#/subjects/geography/deck/world-geography',
    '/#/subjects/geography/quiz',
    '/#/subjects/geography/results',
    '/#/subjects/chemistry/documents',
    '/#/donate',
  ];
  for (const route of routes) {
    await page.goto(route);
    const banner = page.locator('.session-banner');
    await expect(banner).toHaveCount(1);
    await expect(banner).toContainText('Tiến độ chỉ tồn tại trong phiên này');
    await expect(banner).toContainText('Tải lại hoặc đóng tab sẽ xóa câu trả lời, kết quả và vị trí đang học.');
    await expect(banner.getByRole('button')).toHaveCount(0);
  }
  await clean(page);
});
test('all question types, exact grading, explanations, restart and result reset', async ({ page }) => {
  const deck = JSON.parse(readFileSync('tests/fixtures/data/tests/chemistry-foundations.json', 'utf8')) as {
    questions: Question[];
  };
  await page.goto('/#/subjects/chemistry/tests');
  await page.locator('.resource-row').filter({ hasText: 'Chemistry foundations' }).click();
  await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
  for (let i = 0; i < deck.questions.length; i++) {
    const prompt = await page.locator('.prompt').innerText();
    const q = deck.questions.find((q) => q.prompt === prompt)!;
    if (q.type === 'multiple_choice')
      await page.getByRole('radio').filter({ hasText: q.choices[q.correctIndex] }).click();
    if (q.type === 'multiple_select') {
      for (const index of q.correctIndices)
        await page.getByRole('checkbox').filter({ hasText: q.choices[index] }).click();
      await page.getByRole('button', { name: 'Xác nhận đáp án', exact: true }).click();
    }
    if (q.type === 'true_false')
      await page
        .getByRole('radio')
        .filter({ hasText: q.answer ? 'Đúng' : 'Sai' })
        .click();
    if (i < deck.questions.length - 1) await page.getByRole('button', { name: 'Tiếp', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Nộp bài' }).click();
  await expect(page.getByRole('heading', { name: 'Đúng 11 / 11 câu' })).toBeVisible();
  await expect(page.locator('.result-summary')).toContainText('Sai 0 câu · Chưa trả lời 0 câu');
  await expect(page.locator('.result-summary')).not.toContainText('điểm');
  await expect(page.locator('.review-card')).toHaveCount(11);
  await expect(page.locator('.explanation').first()).toBeVisible();
  await page.getByLabel('Chỉ xem câu trả lời sai').check();
  await expect(page.getByText('Không có câu trả lời sai.')).toBeVisible();
  await clean(page);
  await page.getByRole('button', { name: 'Làm lại', exact: true }).first().click();
  await expect(page.locator('.quiz-head')).toContainText('Đã trả lời 0 câu');
  await page.getByRole('button', { name: 'Nộp bài' }).click();
  await page.reload();
  await expect(page.getByText('Chưa có kết quả.')).toBeVisible();
  await clean(page);
});
test('whole-quiz timer expires, submits timeouts and resets on reload', async ({ page }) => {
  await page.clock.install();
  await page.goto('/#/subjects/geography/tests');
  await page.getByRole('link', { name: /World geography/ }).click();
  await page.getByRole('radio', { name: '15 phút' }).check();
  await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText(/^\d{2}:\d{2}$/);
  await page.clock.fastForward(15 * 60 * 1000 + 1_000);
  await expect(page.getByRole('heading', { name: /Đúng 0 \/ \d+ câu/ })).toBeVisible();
  await expect(page.locator('.result-summary')).toContainText('Chưa trả lời 0 câu');
  await expect(page.locator('.review-card').first()).toContainText('Hết giờ');
  await page.reload();
  await expect(page.getByText('Chưa có kết quả.')).toBeVisible();
  await clean(page);
});
for (const [subject, id, format] of [
  ['geography', 'geography-field-notes', 'pdf'],
  ['biology', 'living-world', 'docx'],
  ['chemistry', 'atoms', 'md'],
  ['english', 'vocabulary-notes', 'txt'],
])
  test(`${format}: document deep link offers a new-tab link`, async ({ page }) => {
    await page.goto(`/#/subjects/${subject}/document/${id}`);
    const link = page.getByRole('link', { name: 'Mở tài liệu trong tab mới ↗' });
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('href', new RegExp(`\\.${format}$`));
    await clean(page);
  });
test('document search/category, themes, read-only UI, failed content recovery', async ({ page }) => {
  await page.goto('/#/subjects/chemistry/documents');
  await page.getByRole('searchbox').fill('atoms');
  await expect(page.locator('.resource-row')).toHaveCount(1);
  await page.getByRole('searchbox').fill('');
  await page.getByLabel('Loại tài liệu', { exact: true }).selectOption('Science');
  await expect(page.locator('.resource-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Dùng giao diện tối' }).click();
  await expect(page.locator('[data-theme]')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Dùng giao diện sáng' }).click();
  await expect(page.locator('[data-theme]')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: /create|edit|import|export|delete/i })).toHaveCount(0);
  await clean(page);
  await page.route('https://sheets.googleapis.com/**', (route) => route.fulfill({ status: 500, body: 'failure' }));
  await page.goto('/#/subjects');
  await page.reload();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('alert')).toContainText('Không thể tải danh sách môn học');
  await page.unroute('https://sheets.googleapis.com/**');
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.locator('.subject-card')).toHaveCount(8);
});
test('malformed worksheet data shows a friendly source error and can retry', async ({ page }) => {
  const broken = fixtureWorkbook();
  broken.valueRanges[0].values[0][0] = 'wrong';
  await page.route('https://sheets.googleapis.com/**', (route) => route.fulfill({ json: broken }));
  await page.goto('/#/subjects');
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Dữ liệu học liệu đang có lỗi ở nguồn (Google Sheets).');
  await expect(alert).toContainText('hãy báo cho quản trị viên');
  await expect(alert).not.toContainText('Tiêu đề cột');
  await page.unroute('https://sheets.googleapis.com/**');
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.locator('.subject-card')).toHaveCount(8);
  await clean(page);
});
test('subject → chapter → all three resources with scoped breadcrumbs and deep links', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('searchbox', { name: 'Tìm môn học' }).fill('DBI202');
  await expect(page.locator('.subject-card')).toHaveCount(1);
  await expect(page.locator('.resource-counts')).toContainText('3 flashcard set');
  await page.locator('.subject-card').click();
  await expect(page.getByRole('navigation', { name: 'Các mục môn học' }).getByRole('link')).toHaveCount(3);
  await page.getByLabel('Chương', { exact: true }).selectOption('sql');
  await expect(page.locator('.resource-row')).toHaveCount(1);
  await page.locator('.resource-row').click();
  await expect(page.getByRole('navigation', { name: 'Đường dẫn' })).toContainText('SQL essentials');
  await page.getByRole('link', { name: 'Quay lại SQL essentials' }).click();
  await page
    .getByRole('navigation', { name: 'Các mục môn học' })
    .getByRole('link', { name: /Tài liệu/ })
    .click();
  await expect(page.locator('.resource-row')).toHaveAttribute('target', '_blank');
  await expect(page.locator('.resource-row')).toHaveAttribute('href', /documents\/database\/sql\.md$/);
  await page
    .getByRole('navigation', { name: 'Các mục môn học' })
    .getByRole('link', { name: /Bài kiểm tra/ })
    .click();
  await page.locator('.resource-row').click();
  await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
  await page.getByRole('button', { name: 'Nộp bài' }).click();
  await expect(page.getByRole('heading', { name: 'Đúng 0 / 3 câu' })).toBeVisible();
  await page.getByLabel('Chỉ xem câu trả lời sai').check();
  await expect(page.locator('.review-card')).toHaveCount(3);
  await clean(page);
  await page.goto('/#/subjects/java/deck/database-sql');
  await expect(page.getByRole('alert')).toContainText('Không tìm thấy');
  await page.goto('/#/subjects/database/documents/chapter/sql');
  await page.reload();
  await expect(page.getByLabel('Chương', { exact: true })).toHaveValue('sql');
  await expect(page.locator('.resource-row')).toHaveCount(1);
});
test('shared header and subject resource controls remain fixed while scrolling', async ({ page }) => {
  await page.goto('/#/subjects/database/documents');
  const header = page.locator('.titlebar');
  const toolbar = page.locator('.resource-toolbar');
  await expect(header).toHaveCSS('position', 'fixed');
  await expect(toolbar).toHaveCSS('position', 'sticky');
  const initial = await page.evaluate(() => {
    const header = document.querySelector('.titlebar')!.getBoundingClientRect();
    const toolbar = document.querySelector('.resource-toolbar')!.getBoundingClientRect();
    return { headerTop: header.top, headerBottom: header.bottom, toolbarTop: toolbar.top };
  });
  await page.evaluate(() => window.scrollTo(0, 600));
  const scrolled = await page.evaluate(() => {
    const header = document.querySelector('.titlebar')!.getBoundingClientRect();
    const toolbar = document.querySelector('.resource-toolbar')!.getBoundingClientRect();
    return { headerTop: header.top, headerBottom: header.bottom, toolbarTop: toolbar.top };
  });
  expect(scrolled.headerTop).toBe(0);
  expect(scrolled.toolbarTop).toBeGreaterThanOrEqual(scrolled.headerBottom - 1);
  expect(scrolled.toolbarTop).toBeLessThan(initial.toolbarTop + 5);
  await clean(page);
});
test('missing subjects/chapters and subject-specific empty sections are explicit', async ({ page }) => {
  await page.goto('/#/subjects/missing/flashcards');
  await expect(page.getByRole('alert')).toContainText('Không tìm thấy');
  await page.goto('/#/subjects/java/flashcards/chapter/missing');
  await expect(page.getByText('Không tìm thấy chương này.')).toBeVisible();
  await page.goto('/#/subjects/german/documents');
  await expect(page.getByText('Chưa có tài liệu ở đây.')).toBeVisible();
  await clean(page);
});

test('code-only search, global document filter and disabled Syllabus', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.nav-soon')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('.nav-soon')).toContainText('SOON');
  await page.getByRole('searchbox', { name: 'Tìm môn học' }).fill('Database Systems');
  await expect(page.locator('.subject-card')).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Tìm môn học' }).fill('dbi202');
  await expect(page.locator('.subject-card')).toHaveCount(1);
  await page.getByRole('link', { name: 'Documents', exact: true }).click();
  await page.getByLabel('Mã môn', { exact: true }).selectOption('database');
  await expect(page.locator('.resource-row')).toHaveCount(3);
  await page.getByRole('searchbox').fill('SQL');
  await expect(page.locator('.resource-row')).toHaveCount(1);
  await clean(page);
  await page.goto('/#/syllabus');
  await expect(page.getByText('Syllabus — SOON', { exact: true })).toBeVisible();
  await clean(page);
});

test('quiz setup, immediate feedback and infinite finish count answered turns', async ({ page }) => {
  await page.goto('/#/subjects/chemistry/tests');
  await page.locator('.resource-row').filter({ hasText: 'Chemistry foundations' }).click();
  await expect(page.getByRole('form', { name: 'Thiết lập bài kiểm tra' })).toBeVisible();
  await page.getByRole('radio', { name: 'Tự do chuyển câu' }).check();
  await page.getByRole('checkbox', { name: 'Vô hạn (random có lặp)' }).check();
  await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
  await expect(page.locator('.quiz-head')).toContainText('Câu 1 / ∞');
  for (let turn = 0; turn < 2; turn++) {
    await page.locator('.answer').first().click();
    const confirm = page.getByRole('button', { name: 'Xác nhận đáp án', exact: true });
    if (await confirm.count()) await confirm.click();
    await expect(page.locator('.question-feedback')).toContainText('Đáp án đúng:');
    await expect(page.locator('.answer').first()).toBeDisabled();
    await page.getByRole('button', { name: 'Tiếp', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Kết thúc', exact: true }).click();
  await expect(page.locator('.review-card')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: /Đúng \d \/ 2 câu/ })).toBeVisible();
  await clean(page);
  await page.getByRole('button', { name: 'Làm lại', exact: true }).first().click();
  await expect(page.locator('.quiz-head')).toContainText('Đã trả lời 0 câu');
  await expect(page.locator('.quiz-head')).toContainText('Câu 1 / ∞');
  await page.reload();
  await expect(page.getByText('Sẵn sàng bắt đầu?')).toBeVisible();
});
