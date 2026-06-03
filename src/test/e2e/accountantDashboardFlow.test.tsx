/**
 * E2E smoke — لوحة المحاسب
 * يتحقق من:
 *   1) ظهور الويدجتات التشغيلية (متأخرات/تحصيل) دائماً
 *   2) إخفاء بطاقتي H-02/H-03 عند `financial_cards=hidden` (الافتراضي)
 *   3) ظهور بطاقتي H-02/H-03 عند `financial_cards=visible`
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AccountantDashboardView from '@/components/dashboard/views/AccountantDashboardView';
import type { AccountantMetrics } from '@/hooks/page/admin/dashboard/useAccountantDashboardData';
import type { AggregatedData } from '@/types/financial/dashboard';

vi.mock('@/hooks/data/settings/app/useAppSettings', () => ({
  useAppSettings: vi.fn(),
}));
import { useAppSettings } from '@/hooks/data/settings/app/useAppSettings';

const baseMetrics: AccountantMetrics = {
  overdueInvoices: [],
  overdueTotal: 0,
  undocumentedExpensesCount: null,
  documentationRate: null,
  monthlyCollection: [],
  unsubmittedZatcaCount: 0,
  orphanedContractsCount: 0,
  pendingInvoicesCount: 3,
  totalCollected: 100_000,
  totalExpected: 200_000,
};

const aggregated = {
  totals: { total_income: 500_000, available_amount: 250_000 },
} as unknown as AggregatedData;

const renderView = (props?: { aggregated?: AggregatedData | null }) =>
  render(
    <MemoryRouter>
      <AccountantDashboardView
        metrics={baseMetrics}
        aggregated={props?.aggregated ?? aggregated}
        isLoading={false}
      />
    </MemoryRouter>,
  );

describe('AccountantDashboardView — feature flag gating', () => {
  it('hides H-02/H-03 by default', () => {
    (useAppSettings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: {}, isLoading: false });
    renderView();
    expect(screen.queryByTestId('accountant-financial-cards')).toBeNull();
    expect(screen.getByText('فواتير معلقة')).toBeInTheDocument();
  });

  it('shows H-02/H-03 when flag is visible', () => {
    (useAppSettings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { 'feature_visibility.accountant.financial_cards': 'visible' },
      isLoading: false,
    });
    renderView();
    expect(screen.getByTestId('accountant-financial-cards')).toBeInTheDocument();
    expect(screen.getByText(/إجمالي الإيرادات/)).toBeInTheDocument();
    expect(screen.getByText(/صافي الريع المتاح/)).toBeInTheDocument();
  });

  it('does not render financial cards when aggregated is null', () => {
    (useAppSettings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { 'feature_visibility.accountant.financial_cards': 'visible' },
      isLoading: false,
    });
    renderView({ aggregated: null });
    expect(screen.queryByTestId('accountant-financial-cards')).toBeNull();
  });
});
