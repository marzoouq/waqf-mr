/**
 * E2E: سلامة دورة العقد → الفواتير → التحصيل (قراءة فقط).
 * لا ينشئ أو يعدّل بيانات — يتحقق من أن الشاشات تفتح وتُظهر أرقاماً متسقة
 * وأن روابط الدورة المالية غير مكسورة.
 */
import { test, expect, type Page } from '@playwright/test';
import { restoreAdminSession } from './helpers/auth';

const openPage = async (page: Page, path: string) => {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
};

/** يجمع أخطاء الواجهة الحقيقية ويستثني الضجيج المعروف. */
const collectErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (/favicon|ResizeObserver|Download the React DevTools|manifest/i.test(text)) return;
    errors.push(text);
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
};

const FINANCIAL_ROUTES = [
  { path: '/dashboard/contracts', marker: /العقود/ },
  { path: '/dashboard/invoices', marker: /الفواتير|فاتورة/ },
  { path: '/dashboard/income', marker: /الإيرادات|التحصيل/ },
  { path: '/dashboard/expenses', marker: /المصروفات/ },
  { path: '/dashboard/distributions', marker: /التوزيع/ },
  { path: '/dashboard/accounts', marker: /الحسابات|ريع/ },
];

test.describe('دورة العقد والفواتير — سلامة الشاشات', () => {
  test.beforeEach(async ({ context, page }) => {
    await restoreAdminSession(context, page);
    const admin = await isAdminSession(page);
    test.skip(!admin, 'جلسة الاختبار ليست لناظر — تخطّي شاشات الإدارة');
  });

  for (const { path, marker } of FINANCIAL_ROUTES) {
    test(`${path} يفتح دون أخطاء واجهة`, async ({ page }) => {
      const errors = collectErrors(page);
      await openPage(page, path);
      await expect(page.locator('body')).toContainText(marker, { timeout: 25_000 });
      expect(errors, `أخطاء في ${path}:\n${errors.join('\n')}`).toEqual([]);
    });
  }

  test('صفحة العقود تعرض جدولاً أو حالة فراغ واضحة — لا شاشة بيضاء', async ({ page }) => {
    await openPage(page, '/dashboard/contracts');
    const hasTable = await page.locator('table').count();
    const hasEmptyState = await page.getByText(/لا توجد|لا يوجد/).count();
    expect(hasTable + hasEmptyState).toBeGreaterThan(0);
  });

  test('صفحة التوزيعات لا تُظهر قيماً سالبة في الأرصدة', async ({ page }) => {
    await openPage(page, '/dashboard/distributions');
    await expect(page.locator('body')).toContainText(/التوزيع/, { timeout: 25_000 });
    const body = (await page.locator('body').innerText()).replace(/\u200f|\u200e/g, '');
    const negatives = body.match(/-\s?\d[\d,]*\.\d{2}/g) ?? [];
    expect(negatives, `أرصدة سالبة معروضة: ${negatives.join(', ')}`).toEqual([]);
  });

  test('تنزيل الفاتورة لا يعتمد على رابط تخزين مباشر', async ({ page }) => {
    const storageCalls: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (/\/storage\/v1\/object\/(public|sign)\/invoices/.test(url)) storageCalls.push(url);
    });
    await openPage(page, '/dashboard/invoices');
    await expect(page.locator('body')).toContainText(/الفواتير|فاتورة/, { timeout: 25_000 });
    expect(storageCalls, 'الواجهة تطلب ملفات الفواتير من التخزين مباشرة').toEqual([]);
  });
});
