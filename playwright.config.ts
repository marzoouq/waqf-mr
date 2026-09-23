import { defineConfig, devices } from '@playwright/test';

/**
 * مسار متصفح بديل (اختياري) — يُستخدم في البيئات التي تُوفّر Chromium مثبّتاً مسبقاً
 * بنسخة لا تطابق نسخة Playwright. في CI يُترك فارغاً فيُستخدم متصفح Playwright.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8080',
    viewport: { width: 1280, height: 1800 },
    locale: 'ar-SA',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } },
    },
  ],
});
