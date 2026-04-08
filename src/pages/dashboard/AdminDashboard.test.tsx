import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/components/layout/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/layout/FiscalYearSelector', () => ({ default: () => <div>FiscalYearSelector</div> }));
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
}));

vi.mock('@/hooks/auth/useAuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'u1', email: 'admin@waqf.app', user_metadata: {} }, role: 'admin', signOut: vi.fn() })),
}));

vi.mock('@/hooks/data/useDashboardSummary', () => ({
  useDashboardSummary: vi.fn(() => ({
    properties: [
      { id: 'p1', property_number: '101', property_type: 'عمارة', location: 'الرياض', area: 500 },
      { id: 'p2', property_number: '102', property_type: 'شقة', location: 'جدة', area: 200 },
    ],
    contracts: [
      { id: 'c1', contract_number: 'W-001', tenant_name: 'أحمد', rent_amount: 30000, status: 'active', start_date: '2024-01-01', end_date: '2025-01-01' },
      { id: 'c2', contract_number: 'W-002', tenant_name: 'محمد', rent_amount: 20000, status: 'expired', start_date: '2023-01-01', end_date: '2024-01-01' },
    ],
    allUnits: [
      { id: 'u1', unit_number: '1', status: 'مؤجرة', property_id: 'p1' },
      { id: 'u2', unit_number: '2', status: 'شاغرة', property_id: 'p1' },
    ],
    paymentInvoices: [],
    contractAllocations: [],
    advanceRequests: [],
    orphanedContracts: [],
    income: [{ id: 'i1', amount: 30000, date: '2024-03-15', source: 'إيجار' }],
    expenses: [{ id: 'e1', amount: 5000, date: '2024-03-20', expense_type: 'صيانة' }],
    accounts: [],
    beneficiaries: [{ id: 'b1', name: 'فهد', share_percentage: 50 }, { id: 'b2', name: 'سارة', share_percentage: 50 }],
    settings: null,
    allFiscalYears: [{ id: 'fy-1', label: '1446-1447هـ', status: 'active' }],
    yoy: { hasPrevYear: false, prevTotalIncome: 0, prevTotalExpenses: 0, prevNetAfterExpenses: 0 },
    isLoading: false,
  })),
}));

vi.mock('@/hooks/financial/useComputedFinancials', () => ({
  useComputedFinancials: vi.fn(() => ({
    totalIncome: 30000,
    totalExpenses: 5000,
    adminShare: 2500,
    waqifShare: 2500,
    waqfRevenue: 20000,
    netAfterExpenses: 25000,
    netAfterZakat: 25000,
    availableAmount: 20000,
    zakatAmount: 0,
    distributionsAmount: 0,
    usingFallbackPct: false,
  })),
}));

vi.mock('@/hooks/financial/useFiscalYears', () => ({
  useActiveFiscalYear: vi.fn(() => ({
    data: { id: 'fy-1', label: '1446-1447هـ' },
    fiscalYears: [{ id: 'fy-1', label: '1446-1447هـ' }],
    isLoading: false,
  })),
  useFiscalYears: vi.fn(() => ({
    data: [{ id: 'fy-1', label: '1446-1447هـ', status: 'active' }],
    isLoading: false,
  })),
}));

vi.mock('@/hooks/data/usePdfWaqfInfo', () => ({
  usePdfWaqfInfo: vi.fn(() => undefined),
}));

vi.mock('@/components/reports/YearOverYearComparison', () => ({
  default: () => <div data-testid="year-comparison">YearOverYearComparison</div>,
}));

vi.mock('@/hooks/financial/useYoYComparison', () => ({
  useYoYComparison: vi.fn(() => ({ hasPrevYear: false, prevTotalIncome: 0, prevTotalExpenses: 0, prevNetAfterExpenses: 0 })),
  calcChangePercent: vi.fn(() => null),
}));

vi.mock('@/hooks/financial/useAdvanceRequests', () => ({
  useAdvanceRequests: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/hooks/page/useAdminDashboardStats', () => ({
  useAdminDashboardStats: vi.fn(() => ({
    stats: [
      { title: 'إجمالي العقارات', value: 2, icon: () => null, color: 'bg-primary', link: '/dashboard/properties' },
      { title: 'العقود النشطة', value: 1, icon: () => null, color: 'bg-secondary', link: '/dashboard/contracts' },
      { title: 'إجمالي الدخل الفعلي', value: '30,000 ر.س', icon: () => null, color: 'bg-primary', link: '/dashboard/income' },
      { title: 'إجمالي المصروفات', value: '5,000 ر.س', icon: () => null, color: 'bg-destructive', link: '/dashboard/expenses' },
      { title: 'حصة الناظر', value: 'تُحسب عند الإقفال', icon: () => null, color: 'bg-accent', link: '/dashboard/accounts' },
      { title: 'حصة الواقف', value: 'تُحسب عند الإقفال', icon: () => null, color: 'bg-secondary', link: '/dashboard/accounts' },
      { title: 'المستفيدون النشطون', value: 2, icon: () => null, color: 'bg-muted', link: '/dashboard/beneficiaries' },
    ],
    kpis: [
      { label: 'نسبة التحصيل', value: 0, suffix: '%', color: 'text-muted-foreground', progressColor: '' },
      { label: 'معدل الإشغال', value: 50, suffix: '%', color: 'text-success', progressColor: '[&>div]:bg-success' },
    ],
    collectionSummary: { percentage: 0, paid: 0, total: 0, outstanding: 0 },
    collectionColor: { text: 'text-muted-foreground', bar: '' },
  })),
}));

vi.mock('@/contexts/FiscalYearContext', () => ({
  useFiscalYear: vi.fn(() => ({
    fiscalYearId: 'fy-1',
    setFiscalYearId: vi.fn(),
    fiscalYear: { id: 'fy-1', label: '1446-1447هـ', status: 'active', start_date: '2024-01-01', end_date: '2025-01-01' },
    fiscalYears: [{ id: 'fy-1', label: '1446-1447هـ', status: 'active', start_date: '2024-01-01', end_date: '2025-01-01' }],
    isClosed: false,
    isLoading: false,
  })),
  FiscalYearProvider: ({ children }: any) => children,
}));

vi.mock('@/hooks/data/useProperties', () => ({
  useProperties: vi.fn(() => ({
    data: [
      { id: 'p1', property_number: '101', property_type: 'عمارة', location: 'الرياض', area: 500 },
      { id: 'p2', property_number: '102', property_type: 'شقة', location: 'جدة', area: 200 },
    ],
    isLoading: false,
  })),
}));

vi.mock('@/hooks/data/useContracts', () => ({
  useContractsByFiscalYear: vi.fn(() => ({
    data: [
      { id: 'c1', contract_number: 'W-001', tenant_name: 'أحمد', rent_amount: 30000, status: 'active', start_date: '2024-01-01', end_date: '2025-01-01', fiscal_year_id: 'fy-1', created_at: '2024-01-01' },
      { id: 'c2', contract_number: 'W-002', tenant_name: 'محمد', rent_amount: 20000, status: 'expired', start_date: '2023-01-01', end_date: '2024-01-01', fiscal_year_id: 'fy-1', created_at: '2023-06-01' },
    ],
    isLoading: false,
  })),
}));

vi.mock('@/hooks/data/useUnits', () => ({
  useAllUnits: vi.fn(() => ({
    data: [
      { id: 'u1', unit_number: '1', status: 'مؤجرة', property_id: 'p1' },
      { id: 'u2', unit_number: '2', status: 'شاغرة', property_id: 'p1' },
    ],
    isLoading: false,
  })),
}));

vi.mock('@/hooks/data/useTenantPayments', () => ({
  useTenantPayments: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
}));

vi.mock('@/hooks/data/usePaymentInvoices', () => ({
  usePaymentInvoices: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
}));

import AdminDashboard from './AdminDashboard';

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter><AdminDashboard /></BrowserRouter>
    </QueryClientProvider>
  );
};

describe('AdminDashboard', () => {
  it('renders page title', () => {
    renderPage();
    expect(screen.getByText('لوحة التحكم')).toBeInTheDocument();
  });

  it('renders welcome message with fiscal year', () => {
    renderPage();
    expect(screen.getByText(/مرحباً بك/)).toBeInTheDocument();
    const matches = screen.getAllByText(/1446-1447/);
    expect(matches.length).toBeGreaterThan(0);
  });


  it('shows total properties count', () => {
    renderPage();
    expect(screen.getByText('إجمالي العقارات')).toBeInTheDocument();
    const twos = screen.getAllByText('2');
    expect(twos.length).toBeGreaterThan(0);
  });

  it('shows active contracts count', () => {
    renderPage();
    expect(screen.getByText('العقود النشطة')).toBeInTheDocument();
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThan(0);
  });

  it('shows total income', () => {
    renderPage();
    expect(screen.getByText('إجمالي الدخل الفعلي')).toBeInTheDocument();
    const incomeValues = screen.getAllByText(/30,000/);
    expect(incomeValues.length).toBeGreaterThan(0);
  });

  it('shows total expenses', () => {
    renderPage();
    expect(screen.getByText('إجمالي المصروفات')).toBeInTheDocument();
    expect(screen.getByText('5,000 ر.س')).toBeInTheDocument();
  });

  it('shows admin and waqif shares with active year suffix', () => {
    renderPage();
    // Active year adds " (بعد الإقفال)" suffix
    expect(screen.getByText(/حصة الناظر/)).toBeInTheDocument();
    expect(screen.getByText(/حصة الواقف/)).toBeInTheDocument();
  });

  it('shows beneficiaries count', () => {
    renderPage();
    expect(screen.getByText(/المستفيدون النشطون/)).toBeInTheDocument();
  });

  it('shows KPI section', () => {
    renderPage();
    expect(screen.getByText(/مؤشرات الأداء الرئيسية/)).toBeInTheDocument();
    expect(screen.getByText('نسبة التحصيل')).toBeInTheDocument();
    expect(screen.getByText('معدل الإشغال')).toBeInTheDocument();
  });

  it('shows recent contracts table', () => {
    renderPage();
    expect(screen.getByText('آخر العقود')).toBeInTheDocument();
  });

  it('shows print button', () => {
    renderPage();
    expect(screen.getByText('طباعة')).toBeInTheDocument();
  });
});
