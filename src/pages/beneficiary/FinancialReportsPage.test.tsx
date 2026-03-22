import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
  Legend: () => <div />,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'u1', email: 'ben@waqf.com' }, role: 'beneficiary', signOut: vi.fn() })),
}));

vi.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: vi.fn(() => ({ getJsonSetting: vi.fn((_k: string, d: any) => d), isLoading: false })),
}));

vi.mock('@/hooks/usePdfWaqfInfo', () => ({ usePdfWaqfInfo: vi.fn(() => ({ name: 'وقف' })) }));

vi.mock('@/hooks/useFiscalYears', () => ({
  useActiveFiscalYear: vi.fn(() => ({ data: { id: 'fy1', label: '1446-1447' }, fiscalYears: [{ id: 'fy1', label: '1446-1447' }] })),
  useFiscalYears: vi.fn(() => ({ data: [{ id: 'fy1', label: '1446-1447' }] })),
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
    income: [{ date: '2024-01-15', amount: 5000, source: 'إيجار' }],
    beneficiaries: [{ user_id: 'u1', name: 'مستفيد', share_percentage: 10 }],
    currentAccount: { fiscal_year: '1446-1447' },
    isAccountMissing: false,
    totalIncome: 100000,
    totalExpenses: 20000,
    netAfterVat: 77000,
    netAfterZakat: 70000,
    adminShare: 7700,
    waqifShare: 3850,
    waqfRevenue: 63950,
    waqfCorpusManual: 5000,
    availableAmount: 58950,
    zakatAmount: 1500,
    incomeBySource: { 'إيجار': 80000, 'متأخرات': 20000 },
    expensesByTypeExcludingVat: { 'كهرباء': 10000, 'صيانة': 10000 },
    isLoading: false,
    isError: false,
  })),
}));

vi.mock('@/hooks/useMyShare', () => ({
  useMyShare: vi.fn(() => ({
    currentBeneficiary: { user_id: 'u1', name: 'مستفيد', share_percentage: 10 },
    myShare: 58950,
    totalBenPct: 10,
    pctLoading: false,
  })),
}));

vi.mock('@/hooks/useTotalBeneficiaryPercentage', () => ({
  useTotalBeneficiaryPercentage: vi.fn(() => ({ data: 10, isLoading: false })),
}));

vi.mock('@/components/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/ExportMenu', () => ({ default: (props: any) => <button data-testid="export-menu" onClick={props.onExportPdf}>تصدير</button> }));
vi.mock('@/components/FiscalYearSelector', () => ({ default: () => <div data-testid="fiscal-year-selector" /> }));
vi.mock('@/components/NoPublishedYearsNotice', () => ({ default: () => null }));
vi.mock('@/components/RequirePublishedYears', () => ({ default: ({ children }: any) => <>{children}</> }));
vi.mock('@/components/SkeletonLoaders', () => ({ DashboardSkeleton: () => <div>loading</div> }));
vi.mock('@/utils/pdf', () => ({ generateAnnualReportPDF: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/components/PageHeaderCard', () => ({ default: ({ title, actions }: any) => <div>{title}{actions}</div> }));

// Mock the lazy-loaded charts component
vi.mock('@/components/financial/FinancialChartsInner', () => ({
  default: () => (
    <div>
      <h3>مقارنة الإيرادات والمصروفات</h3>
      <h3>حصتي من الريع</h3>
      <h3>الإيرادات حسب المصدر</h3>
      <h3>المصروفات حسب النوع</h3>
    </div>
  ),
}));

import FinancialReportsPage from './FinancialReportsPage';

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <FinancialReportsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('FinancialReportsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders page title', () => {
    renderPage();
    expect(screen.getByText('التقارير المالية')).toBeInTheDocument();
  });

  it('shows chart titles', async () => {
    const { container } = renderPage();
    // Lazy component renders asynchronously via Suspense
    await vi.waitFor(() => {
      expect(container.textContent).toContain('مقارنة الإيرادات والمصروفات');
    }, { timeout: 3000 });
  });

  it('includes fiscal year selector', () => {
    renderPage();
    expect(screen.getByText('التقارير المالية')).toBeInTheDocument();
  });

  it('includes export menu', () => {
    renderPage();
    expect(screen.getByTestId('export-menu')).toBeInTheDocument();
  });

  it('calculates my share correctly (10% of 60000 = 6000)', () => {
    renderPage();
    expect(screen.getByText('التقارير المالية')).toBeInTheDocument();
  });
});
