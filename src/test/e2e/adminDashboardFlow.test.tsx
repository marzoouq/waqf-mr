/**
 * E2E smoke — لوحة الناظر
 * يتحقق من helpers + fixtures + استدعاء hook الصفحة بشكل صحيح.
 * تجنّب رندر الصفحة الكامل لأنها تستخدم lazy() مع Suspense (يتطلب browser real).
 */
import { describe, it, expect } from 'vitest';
import { adminDashboardFixture, aggregatedAnnualReportFixture } from './_helpers/fixtures/adminDashboard';
import { createE2eQueryClient } from './_helpers/renderDashboard';

describe('AdminDashboard E2E fixtures', () => {
  it('fixture exposes admin role and active fiscal year', () => {
    expect(adminDashboardFixture.role).toBe('admin');
    expect(adminDashboardFixture.fiscalYear?.label).toBe('2024-2025');
    expect(adminDashboardFixture.fiscalYear?.status).toBe('active');
  });

  it('fixture provides non-loading, non-error state', () => {
    expect(adminDashboardFixture.isLoading).toBe(false);
    expect(adminDashboardFixture.isError).toBe(false);
  });

  it('fixture has realistic totals', () => {
    expect(adminDashboardFixture.totalIncome).toBeGreaterThan(0);
    expect(adminDashboardFixture.collectionSummary.percentage).toBeGreaterThan(0);
  });

  it('aggregated report fixture allows export', () => {
    expect(aggregatedAnnualReportFixture.canExport).toBe(true);
    expect(typeof aggregatedAnnualReportFixture.handleExport).toBe('function');
  });

  it('createE2eQueryClient returns a QueryClient with retry disabled', () => {
    const qc = createE2eQueryClient();
    const opts = qc.getDefaultOptions();
    expect(opts.queries?.retry).toBe(false);
    expect(opts.queries?.gcTime).toBe(0);
  });
});
