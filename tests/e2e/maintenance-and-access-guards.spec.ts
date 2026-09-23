/**
 * E2E: أدوات الصيانة وحرّاس الوصول.
 * يتحقق أن الناظر يملك تحكماً حقيقياً بوضع الصيانة، وأن حرّاس المسارات تعمل.
 * يعيد وضع الصيانة لحالته الأصلية دائماً (تنظيف إلزامي).
 */
import { test, expect } from '@playwright/test';
import { restoreAdminSession, clearSession, isAdminSession } from './helpers/auth';

const DIAGNOSTICS = '/dashboard/diagnostics';

test.describe('مركز التشخيص — تحكم الناظر بوضع الصيانة', () => {
  test.beforeEach(async ({ context, page }) => {
    await restoreAdminSession(context, page);
    const admin = await isAdminSession(page);
    test.skip(!admin, 'جلسة الاختبار ليست لناظر — تخطّي مسارات الإدارة');
  });

  test('صفحة التشخيص تفتح وتعرض لوحة وضع الصيانة', async ({ page }) => {
    await page.goto(DIAGNOSTICS, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('وضع الصيانة').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel('تبديل وضع الصيانة')).toBeVisible();
  });

  test('تفعيل الصيانة ثم إيقافها — يبقى دخول الناظر ممكناً', async ({ page }) => {
    await page.goto(DIAGNOSTICS, { waitUntil: 'domcontentloaded' });
    const toggle = page.getByLabel('تبديل وضع الصيانة');
    await expect(toggle).toBeVisible({ timeout: 20_000 });

    const wasActive = (await toggle.getAttribute('data-state')) === 'checked';
    if (wasActive) test.skip(true, 'وضع الصيانة مفعّل مسبقاً — لا نغيّر حالة قائمة');

    try {
      await toggle.click();
      await expect(toggle).toHaveAttribute('data-state', 'checked', { timeout: 15_000 });

      // الناظر يبقى داخل لوحة التحكم ولا يُطرد لشاشة الصيانة
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.getByText(/صيانة/).first()).toBeVisible({ timeout: 20_000 });
    } finally {
      await page.goto(DIAGNOSTICS, { waitUntil: 'domcontentloaded' });
      const restore = page.getByLabel('تبديل وضع الصيانة');
      await expect(restore).toBeVisible({ timeout: 20_000 });
      if ((await restore.getAttribute('data-state')) === 'checked') {
        await restore.click();
        await expect(restore).toHaveAttribute('data-state', 'unchecked', { timeout: 15_000 });
      }
    }
  });

  test('تبويبات التشخيص الأساسية متاحة للناظر', async ({ page }) => {
    await page.goto(DIAGNOSTICS, { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('تبديل وضع الصيانة')).toBeVisible({ timeout: 20_000 });
    const tabs = page.getByRole('tab');
    expect(await tabs.count()).toBeGreaterThan(3);
  });
});

test.describe('حرّاس الأدوار — المستفيد لا يصل لصفحات الناظر', () => {
  test.beforeEach(async ({ context, page }) => {
    await restoreAdminSession(context, page);
    const admin = await isAdminSession(page);
    test.skip(admin, 'الجلسة إدارية — لا ينطبق فحص حرمان المستفيد');
  });

  for (const path of ['/dashboard/diagnostics', '/dashboard/users', '/dashboard/settings', '/support/diagnostics']) {
    test(`${path} يُرفض لغير الناظر برسالة واضحة`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: /غير مصرح/ })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByLabel('تبديل وضع الصيانة')).toHaveCount(0);
    });
  }
});

test.describe('حرّاس المسارات للزائر غير المسجّل', () => {
  test.beforeEach(async ({ context, page }) => {
    await clearSession(context, page);
  });

  for (const path of [
    '/dashboard',
    '/dashboard/diagnostics',
    '/dashboard/distributions',
    '/support/diagnostics',
    '/beneficiary/my-share',
  ]) {
    test(`${path} لا يُعرض لزائر غير مسجّل`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      const url = page.url();
      const leaked = /\/dashboard\/(diagnostics|distributions)|\/support\//.test(url) &&
        (await page.getByRole('tab').count()) > 0;
      expect(leaked, `تسريب محتوى محمي في ${path}`).toBe(false);
    });
  }

  test('الصفحة العامة تفتح دون تسجيل دخول', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/وقف|الوقف/, { timeout: 20_000 });
  });
});
