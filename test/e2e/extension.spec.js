// Loads the built extension (dist-test/) into Chromium and drives the real user flow:
// install → settings → check claims → tooltip → popup → dashboard.
import { chromium, expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const extensionPath = path.join(root, 'dist-test');
const BASE = 'http://127.0.0.1:4599';
const shots = process.env.SCREENSHOT_DIR;

let context;
let worker;
let extensionId;

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext('', {
    channel: 'chromium', // the full Chromium build — needed for extensions in headless mode
    headless: !process.env.HEADED,
    deviceScaleFactor: shots ? 2 : 1,
    viewport: { width: 1200, height: 900 },
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  extensionId = new URL(worker.url()).host;
});

test.afterAll(async () => context?.close());

const screenshot = (page, name) =>
  shots && page.screenshot({ path: path.join(shots, `${name}.png`) });

async function openArticle(file) {
  const page = await context.newPage();
  await page.goto(`${BASE}/${file}`);
  const tabId = await worker.evaluate(
    async (url) => (await chrome.tabs.query({ url })).at(-1).id,
    page.url(),
  );
  const scan = () => worker.evaluate((id) => globalThis.ermActually.scanTab(id), tabId);
  return { page, scan };
}

test('opens settings on install and refuses to scan without an API key', async () => {
  // The tab opens as about:blank and then navigates, so poll rather than wait for an event.
  const findOptions = () => context.pages().find((p) => p.url().includes('options/options.html'));
  await expect.poll(findOptions, { timeout: 10_000 }).toBeTruthy();
  const optionsPage = findOptions();
  await expect(optionsPage.getByLabel('Google Fact Check Tools API key')).toBeVisible();

  const { page, scan } = await openArticle('test-article.html');
  await expect(scan()).rejects.toThrow(/No Fact Check API key/);
  await page.close();
});

test('rejects an invalid API key with a helpful message', async () => {
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options/options.html`);
  await options.getByLabel('Google Fact Check Tools API key').fill('wrong-key');
  await options.getByRole('button', { name: 'Save' }).click();
  await expect(options.getByRole('status')).toHaveText('Saved.');

  const { page, scan } = await openArticle('test-article.html');
  await expect(scan()).rejects.toThrow(/rejected the API key/);
  await page.close();

  await options.getByLabel('Google Fact Check Tools API key').fill('test-key');
  await options.getByRole('button', { name: 'Save' }).click();
  await expect(options.getByRole('status')).toHaveText('Saved.');
  await screenshot(options, '01-settings');
  await options.close();
});

test('highlights flagged claims on the test article and shows sources on hover', async () => {
  const { page, scan } = await openArticle('test-article.html');

  const summary = await scan();
  expect(summary).toEqual({ checked: 8, flagged: 4, failed: 0 });

  const highlights = page.locator('.erm-highlight');
  await expect(highlights).toHaveText([
    'The moon landing was a hoax.',
    'Vaccines cause autism.',
    'Climate change is a myth.',
    'Elon Musk was the first person on Mars.',
  ]);

  await highlights.nth(1).hover();
  const tooltip = page.locator('.erm-tooltip');
  await expect(tooltip).toBeVisible();
  await expect(tooltip.getByRole('link', { name: 'FactCheck.org' })).toBeVisible();
  await expect(tooltip).toContainText('rated “False”');

  // v1 hid the tooltip on mouseleave, so its links could never be clicked.
  await tooltip.hover();
  await page.waitForTimeout(400);
  await expect(tooltip).toBeVisible();
  await screenshot(page, '02-test-article');

  // Re-running the scan must not double-wrap or re-inject listeners.
  await scan();
  await expect(highlights).toHaveCount(4);
  await page.close();
});

test('works on a realistic article and treats API data as text', async () => {
  const { page, scan } = await openArticle('article.html');
  const summary = await scan();
  expect(summary.flagged).toBe(5);

  const hostile = page.locator('.erm-highlight', { hasText: 'The world ends by 2027.' });
  await hostile.scrollIntoViewIfNeeded();
  await hostile.hover();
  await expect(page.locator('.erm-tooltip')).toContainText('<img src=x');
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();

  await page.locator('.erm-highlight', { hasText: 'The moon landing never happened.' }).hover();
  await page.mouse.wheel(0, 0);
  await screenshot(page, '03-news-article');
  await page.close();
});

test('popup and dashboard show the real recorded statistics', async () => {
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 300, height: 330 });
  await popup.goto(`chrome-extension://${extensionId}/popup/popup.html`);
  // 4 + 4 on the test article (scanned twice) + 5 on the news article
  await expect(popup.locator('#flagged-count')).toHaveText('13');
  await screenshot(popup, '04-popup');
  await popup.close();

  const dashboard = await context.newPage();
  await dashboard.goto(`chrome-extension://${extensionId}/dashboard/dashboard.html`);
  await expect(dashboard.locator('#empty-state')).toBeHidden();
  await expect(dashboard.locator('#kpi-pages')).toHaveText('3');
  await expect(dashboard.locator('#kpi-top-site')).toHaveText('127.0.0.1');
  await expect(dashboard.locator('#kpi-flagged-month')).toHaveText('13');
  await dashboard.waitForTimeout(800); // let chart animations finish for the screenshot
  await screenshot(dashboard, '05-dashboard');

  await dashboard.getByRole('button', { name: 'Achievements' }).click();
  await expect(dashboard.getByRole('heading', { level: 1 })).toHaveText('Achievements');
  await expect(dashboard.locator('#badge')).not.toHaveText('—');
  await screenshot(dashboard, '06-achievements');
  await dashboard.close();
});
