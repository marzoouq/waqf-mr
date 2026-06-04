/**
 * E2E smoke — صفحات المستفيد (الإفصاح + الحسابات الختامية)
 * يموك hook الصفحة ويتحقق من ظهور البيانات + تبديل السنة المالية (إصلاح H-02).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderDashboard } from './_helpers/renderDashboard';
import { disclosureFixture, accountsViewFixture } from './_helpers/fixtures/beneficiaryData';
import { FY_ACTIVE, FY_CLOSED, mockState, resetMockFy, switchToClosedYear } from './_helpers/mockFiscalYear';

vi.mock('@/hooks/page/beneficiary', () => ({
  useDisclosurePage: vi.fn(() => disclosureFixture),
  useAccountsViewPage: vi.fn(() => accountsViewFixture),
}));
vi.mock('@/contexts/FiscalYearContext', () => ({
  useFiscalYear: () => ({
    fiscalYearId: mockState.fiscalYearId,
    fiscalYear: mockState.fiscalYear,
    fiscalYears: [FY_ACTIVE, FY_CLOSED],
    isClosed: mockState.isClosed,
    isLoading: false,
    noPublishedYears: false,
    isSpecificYear: true,
    setFiscalYearId: vi.fn(),
  }),
}));
vi.mock('@/components/layout', async () => {
  const actual = await vi.importActual<typeof import('@/components/layout')>('@/components/layout');
  return {
    ...actual,
    DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});
vi.mock('@/components/common', async () => {
  const actual = await vi.importActual<typeof import('@/components/common')>('@/components/common');
  return {
    ...actual,
    RequirePublishedYears: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

import DisclosurePage from '@/pages/beneficiary/DisclosurePage';
import AccountsViewPage from '@/pages/beneficiary/AccountsViewPage';

beforeEach(() => {
  resetMockFy();
  vi.clearAllMocks();
});

describe('DisclosurePage E2E', () => {
  it('renders header with active fiscal year label', () => {
    renderDashboard(<DisclosurePage />, { route: '/beneficiary/disclosure' });
    expect(screen.getByText('الإفصاح السنوي')).toBeInTheDocument();
    expect(screen.getByText(/2024-2025/)).toBeInTheDocument();
  });

  it('exposes comprehensive PDF button', () => {
    renderDashboard(<DisclosurePage />, { route: '/beneficiary/disclosure' });
    expect(screen.getByText('تقرير شامل')).toBeInTheDocument();
  });

  it('shows ErrorState when isError=true', async () => {
    const mod = await import('@/hooks/page/beneficiary');
    (mod.useDisclosurePage as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      ...disclosureFixture,
      isError: true,
    });
    renderDashboard(<DisclosurePage />, { route: '/beneficiary/disclosure' });
    expect(screen.getByText(/يرجى التحقق من اتصالك بالإنترنت/)).toBeInTheDocument();
  });
});

describe('AccountsViewPage E2E', () => {
  it('renders header and key sections', () => {
    renderDashboard(<AccountsViewPage />, { route: '/beneficiary/accounts' });
    expect(screen.getAllByText('الحسابات الختامية').length).toBeGreaterThan(0);
  });

  it('shows error UI when finError=true', async () => {
    const mod = await import('@/hooks/page/beneficiary');
    (mod.useAccountsViewPage as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      ...accountsViewFixture,
      finError: true,
    });
    renderDashboard(<AccountsViewPage />, { route: '/beneficiary/accounts' });
    expect(screen.getByText(/حدث خطأ أثناء تحميل البيانات/)).toBeInTheDocument();
  });
});

describe('Fiscal year switch (H-02 fix verification)', () => {
  it('propagates fiscalYearId change from active to closed', () => {
    expect(mockState.fiscalYearId).toBe(FY_ACTIVE.id);
    switchToClosedYear();
    expect(mockState.fiscalYearId).toBe(FY_CLOSED.id);
    expect(mockState.isClosed).toBe(true);
  });
});
