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
test('static collections, keyboard flip/navigation/shuffle, reload and new tab reset', async ({ page, context }) => {
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
  await expect(page.getByText('Thẻ 1 / 11')).toBeVisible();
  await page.keyboard.press('f');
  await expect(page.locator('.card-side')).toHaveText('ĐÁP ÁN');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('Thẻ 2 / 11')).toBeVisible();
  await page.keyboard.press('s');
  await expect(page.getByText('Thẻ 1 / 11')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await page.reload();
  await expect(page.getByText('Thẻ 1 / 11')).toBeVisible();
  await expect(page.locator('.card-side')).toHaveText('CÂU HỎI');
  await clean(page);
  const url = page.url();
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto(url);
  await expect(reopened.getByText('Thẻ 1 / 11')).toBeVisible();
});
test('all question types, exact grading, explanations, restart and result reset', async ({ page }) => {
  const deck = JSON.parse(readFileSync('tests/fixtures/data/tests/chemistry-foundations.json', 'utf8')) as {
    questions: Question[];
  };
  await page.goto('/#/subjects/chemistry/tests');
  await page.getByRole('button', { name: /Chemistry foundations/ }).click();
  for (let i = 0; i < deck.questions.length; i++) {
    const prompt = await page.locator('.prompt').innerText();
    const q = deck.questions.find((q) => q.prompt === prompt)!;
    if (q.type === 'multiple_choice')
      await page.getByRole('radio').filter({ hasText: q.choices[q.correctIndex] }).click();
    if (q.type === 'multiple_select')
      for (const index of q.correctIndices)
        await page.getByRole('checkbox').filter({ hasText: q.choices[index] }).click();
    if (q.type === 'true_false')
      await page
        .getByRole('radio')
        .filter({ hasText: q.answer ? 'Đúng' : 'Sai' })
        .click();
    if (i < deck.questions.length - 1) await page.getByRole('button', { name: 'Tiếp', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Nộp bài' }).click();
  await expect(page.getByRole('heading', { name: 'Đúng 11 / 11 câu' })).toBeVisible();
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
test('timer expiration locks answers and resets on reload', async ({ page }) => {
  await page.clock.install();
  await page.goto('/#/subjects/geography/tests');
  await page.getByLabel('Thời gian làm bài').selectOption('10');
  await page.getByRole('button', { name: /World geography/ }).click();
  await expect(page.getByRole('timer')).toContainText('Còn');
  await page.clock.fastForward(11_000);
  await expect(page.getByRole('timer')).toHaveText('Hết giờ');
  await expect(page.getByRole('radio').first()).toBeDisabled();
  await page.getByRole('button', { name: 'Tiếp', exact: true }).click();
  await expect(page.locator('.quiz-head')).toContainText('Câu 2');
  await page.reload();
  await expect(page.getByText('Sẵn sàng bắt đầu?')).toBeVisible();
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
test('subject → chapter → all three resources with scoped breadcrumbs and deep links', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('searchbox', { name: 'Tìm môn học' }).fill('database');
  await expect(page.locator('.subject-card')).toHaveCount(1);
  await expect(page.locator('.resource-counts')).toContainText('3 bộ thẻ');
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
test('missing subjects/chapters and subject-specific empty sections are explicit', async ({ page }) => {
  await page.goto('/#/subjects/missing/flashcards');
  await expect(page.getByRole('alert')).toContainText('Không tìm thấy');
  await page.goto('/#/subjects/java/flashcards/chapter/missing');
  await expect(page.getByText('Không tìm thấy chương này.')).toBeVisible();
  await page.goto('/#/subjects/german/documents');
  await expect(page.getByText('Chưa có tài liệu ở đây.')).toBeVisible();
  await clean(page);
});
