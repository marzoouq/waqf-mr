import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' }, role: 'beneficiary' })),
}));

vi.mock('@/hooks/useFiscalYears', () => ({
  useActiveFiscalYear: vi.fn(() => ({ data: { id: 'fy1', label: '1446-1447', status: 'active' }, fiscalYears: [{ id: 'fy1', label: '1446-1447', status: 'active' }] })),
  useFiscalYears: vi.fn(() => ({ data: [{ id: 'fy1', label: '1446-1447', status: 'active' }], isLoading: false })),
}));

vi.mock('@/contexts/FiscalYearContext', () => ({
  useFiscalYear: vi.fn(() => ({
    fiscalYearId: 'fy1', setFiscalYearId: vi.fn(),
    fiscalYear: { id: 'fy1', label: '1446-1447', status: 'active', start_date: '2024-01-01', end_date: '2025-01-01' },
    fiscalYears: [{ id: 'fy1', label: '1446-1447', status: 'active' }],
    isClosed: false, isLoading: false, noPublishedYears: false,
  })),
  FiscalYearProvider: ({ children }: any) => children,
}));

vi.mock('@/hooks/useFinancialSummary', () => ({
  useFinancialSummary: vi.fn(() => ({
    beneficiaries: [{ id: 'b1', user_id: 'user-1', name: 'محمد أحمد', share_percentage: 10 }],
    currentAccount: null,
    isAccountMissing: false,
    totalIncome: 200000, totalExpenses: 50000, netAfterVat: 180000,
    netAfterZakat: 170000,
    adminShare: 18000, waqifShare: 9000, waqfRevenue: 153000,
    waqfCorpusManual: 0, vatAmount: 20000, zakatAmount: 0,
    netAfterExpenses: 150000, availableAmount: 100000,
    incomeBySource: {}, expensesByTypeExcludingVat: {},
    remainingBalance: 0, grandTotal: 0,
    isLoading: false, isError: false,
  })),
}));

vi.mock('@/hooks/useMyShare', () => ({
  useMyShare: vi.fn(() => ({
    currentBeneficiary: { id: 'b1', user_id: 'user-1', name: 'محمد أحمد', share_percentage: 10 },
    myShare: 100000,
    totalBenPct: 10,
    pctLoading: false,
  })),
}));

vi.mock('@/hooks/useAdvanceRequests', () => ({
  useMyAdvanceRequests: vi.fn(() => ({ data: [] })),
  usePaidAdvancesTotal: vi.fn(() => ({ data: 0 })),
  useCarryforwardBalance: vi.fn(() => ({ data: 0 })),
  useMyCarryforwards: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/hooks/useContracts', () => ({
  useContractsByFiscalYear: vi.fn(() => ({ data: [] })),
  useContractsSafeByFiscalYear: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/hooks/usePdfWaqfInfo', () => ({ usePdfWaqfInfo: vi.fn(() => ({})) }));
vi.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: vi.fn(() => ({ getJsonSetting: vi.fn((_k: string, d: any) => d), isLoading: false })),
}));
vi.mock('@/hooks/useTotalBeneficiaryPercentage', () => ({
  useTotalBeneficiaryPercentage: vi.fn(() => ({ data: 10, isLoading: false })),
}));

vi.mock('@/components/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/SkeletonLoaders', () => ({ DashboardSkeleton: () => <div>loading</div> }));
vi.mock('@/components/NoPublishedYearsNotice', () => ({ default: () => <div>no years</div> }));
vi.mock('@/components/RequirePublishedYears', () => ({ default: ({ children }: any) => <>{children}</> }));
vi.mock('@/components/PageHeaderCard', () => ({ default: ({ title }: any) => <div>{title}</div> }));
vi.mock('@/utils/pdf', () => ({ generateMySharePDF: vi.fn(), generateDistributionsPDF: vi.fn(), generateComprehensiveBeneficiaryPDF: vi.fn() }));
vi.mock('@/utils/printShareReport', () => ({ printShareReport: vi.fn() }));
vi.mock('@/components/beneficiaries/AdvanceRequestDialog', () => ({ default: () => null }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }) }) },
}));

import MySharePage from './MySharePage';

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><MySharePage /></MemoryRouter>
    </QueryClientProvider>
  );
};

describe('MySharePage', () => {
  it('renders page title', async () => {
    renderPage();
    expect(await screen.findByText('حصتي من الريع')).toBeInTheDocument();
  });

  it('shows share info', async () => {
    const { container } = renderPage();
    await screen.findByText('حصتي من الريع');
    expect(container.textContent).toMatch(/100/);
  });

  it('calculates entitled share', async () => {
    const { container } = renderPage();
    await screen.findByText('حصتي من الريع');
    expect(container.textContent).toMatch(/100/);
  });

  it('shows distributions history section', async () => {
    renderPage();
    expect(await screen.findByText('سجل التوزيعات')).toBeInTheDocument();
  });

  it('shows empty distributions message', async () => {
    renderPage();
    expect(await screen.findByText('لا توجد توزيعات مسجلة بعد')).toBeInTheDocument();
  });

  it('shows link to disclosure page', async () => {
    renderPage();
    expect(await screen.findByText('صفحة الإفصاح السنوي')).toBeInTheDocument();
  });
});
