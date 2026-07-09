/**
 * Playwright auth helpers — restore admin session (injected by Lovable) and
 * login beneficiary via UI form.
 */
import type { BrowserContext, Page } from '@playwright/test';

const APP_ORIGIN = 'http://localhost:8080';

export async function restoreAdminSession(context: BrowserContext, page: Page) {
  const cookiesJson = process.env.LOVABLE_BROWSER_SUPABASE_COOKIES_JSON;
  const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
  const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;

  if (cookiesJson) {
    const cookies = JSON.parse(cookiesJson).map((c: Record<string, unknown>) => ({
      ...c,
      url: APP_ORIGIN,
    }));
    await context.addCookies(cookies);
  }

  await page.goto(APP_ORIGIN);
  if (storageKey && sessionJson) {
    await page.evaluate(
      ({ k, v }) => window.localStorage.setItem(k, v),
      { k: storageKey, v: sessionJson },
    );
  }
}

export async function clearSession(context: BrowserContext, page: Page) {
  await context.clearCookies();
  await page.goto(APP_ORIGIN);
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}

export async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto(`${APP_ORIGIN}/auth`);
  await page.getByLabel(/بريد|email/i).first().fill(email);
  await page.getByLabel(/كلمة|password/i).first().fill(password);
  await page.getByRole('button', { name: /دخول|تسجيل الدخول|sign in/i }).first().click();
  await page.waitForURL(/\/(dashboard|beneficiary|waqif)/, { timeout: 15_000 });
}

export async function selectFiscalYear(page: Page, fiscalYearId: string) {
  await page.evaluate((id) => {
    window.sessionStorage.setItem('fiscal_year_id', id);
  }, fiscalYearId);
}
