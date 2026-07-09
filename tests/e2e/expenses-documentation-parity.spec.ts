/**
 * E2E — تطابق نسبة التوثيق وعدد المرفقات لكل مصروف بين لوحتي الناظر والمستفيد.
 */
import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import {
  restoreAdminSession,
  clearSession,
  loginViaUi,
  selectFiscalYear,
} from './helpers/auth';
import { readSummaryStats, readAttachmentCounts } from './helpers/readExpensesStats';

const SHOTS = 'test-results/parity';
mkdirSync(SHOTS, { recursive: true });

const beneficiaryEmail = process.env.E2E_BENEFICIARY_EMAIL;
const beneficiaryPassword = process.env.E2E_BENEFICIARY_PASSWORD;
const fiscalYearId = process.env.E2E_FISCAL_YEAR_ID;
const hasAdminSession = !!process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;

test.describe('Documentation stats parity (admin ↔ beneficiary)', () => {
  test.skip(
    !beneficiaryEmail || !beneficiaryPassword || !fiscalYearId || !hasAdminSession,
    'Missing E2E env: E2E_BENEFICIARY_EMAIL / E2E_BENEFICIARY_PASSWORD / E2E_FISCAL_YEAR_ID / LOVABLE_BROWSER_SUPABASE_SESSION_JSON',
  );

  test('نسبة التوثيق وعدد المرفقات متطابقة للسنة نفسها', async ({ context, page }) => {
    // ---- Admin ----
    await restoreAdminSession(context, page);
    await selectFiscalYear(page, fiscalYearId!);
    await page.goto('/dashboard/expenses');
    const adminStats = await readSummaryStats(page);
    const adminCounts = await readAttachmentCounts(page);
    await page.screenshot({ path: `${SHOTS}/1_admin_summary.png` });

    // ---- Beneficiary ----
    await clearSession(context, page);
    await loginViaUi(page, beneficiaryEmail!, beneficiaryPassword!);
    await selectFiscalYear(page, fiscalYearId!);
    await page.goto('/beneficiary/expenses');
    const benStats = await readSummaryStats(page);
    const benCounts = await readAttachmentCounts(page);
    await page.screenshot({ path: `${SHOTS}/2_beneficiary_summary.png` });

    // ---- Assertions ----
    expect(benStats.rate, 'documentation rate parity').toBe(adminStats.rate);
    expect(benStats.documented, 'documented count parity').toBe(adminStats.documented);
    expect(benStats.total, 'total expenses parity').toBe(adminStats.total);
    expect(benCounts, 'per-expense attachment counts parity').toEqual(adminCounts);
  });
});
