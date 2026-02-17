import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/components/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));

vi.mock('@/hooks/useProperties', () => ({
  useProperties: vi.fn(() => ({
    data: [
      { id: 'p1', property_number: 'عقار-1', property_type: 'سكني', location: 'الرياض', area: 500 },
      { id: 'p2', property_number: 'عقار-2', property_type: 'تجاري', location: 'جدة', area: 300 },
    ],
  })),
}));

vi.mock('@/hooks/useContracts', () => ({
  useContracts: vi.fn(() => ({
    data: [
      { id: 'c1', property_id: 'p1', rent_amount: 50000, status: 'active', contract_number: '001', tenant_name: 'أ', start_date: '', end_date: '', payment_type: 'سنوي', payment_count: 1 },
      { id: 'c2', property_id: 'p2', rent_amount: 30000, status: 'active', contract_number: '002', tenant_name: 'ب', start_date: '', end_date: '', payment_type: 'سنوي', payment_count: 1 },
    ],
  })),
}));

vi.mock('@/hooks/useUnits', () => ({
  useAllUnits: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/hooks/useFiscalYears', () => ({
  useActiveFiscalYear: vi.fn(() => ({
    data: { id: 'fy1', label: '1446-1447', status: 'active' },
    fiscalYears: [{ id: 'fy1', label: '1446-1447', status: 'active' }],
  })),
  useFiscalYears: vi.fn(() => ({ data: [{ id: 'fy1', label: '1446-1447', status: 'active' }], isLoading: false })),
}));

vi.mock('@/hooks/useFinancialSummary', () => ({
  useFinancialSummary: vi.fn(() => ({
    income: [], expenses: [],
    beneficiaries: [{ id: 'b1', name: 'محمد', share_percentage: 50 }, { id: 'b2', name: 'أحمد', share_percentage: 50 }],
    currentAccount: null,
    totalIncome: 80000, totalExpenses: 20000,
    adminPct: 10, waqifPct: 5,
    zakatAmount: 0, vatAmount: 12000,
    waqfCorpusPrevious: 0, waqfCorpusManual: 0, distributionsAmount: 0,
    grandTotal: 80000, netAfterExpenses: 60000, netAfterVat: 48000, netAfterZakat: 48000,
    adminShare: 4800, waqifShare: 2400, waqfRevenue: 40800,
    availableAmount: 40800, remainingBalance: 40800,
    incomeBySource: { 'إيجارات': 70000, 'أخرى': 10000 },
    expensesByType: { 'صيانة': 15000, 'كهرباء': 5000 },
  })),
}));

vi.mock('@/hooks/usePdfWaqfInfo', () => ({ usePdfWaqfInfo: vi.fn(() => ({})) }));
vi.mock('@/utils/pdf', () => ({
  generateAnnualReportPDF: vi.fn(),
  generateAnnualDisclosurePDF: vi.fn(),
}));

// Mock recharts to avoid SVG rendering issues
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
  Legend: () => <div />,
}));

vi.mock('@/components/reports/MonthlyPerformanceReport', () => ({ default: () => <div>MonthlyReport</div> }));
vi.mock('@/components/reports/YearOverYearComparison', () => ({ default: () => <div>YearComparison</div> }));

import ReportsPage from './ReportsPage';

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><ReportsPage /></MemoryRouter>
    </QueryClientProvider>
  );
};

describe('ReportsPage', () => {
  it('renders page title', () => {
    renderPage();
    expect(screen.getByText('التقارير')).toBeInTheDocument();
  });

  it('shows total income summary card', () => {
    renderPage();
    expect(screen.getAllByText('إجمالي الدخل').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/80,000/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows total expenses summary card', () => {
    renderPage();
    expect(screen.getAllByText('إجمالي المصروفات').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/20,000/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows net revenue summary card', () => {
    renderPage();
    expect(screen.getAllByText('صافي الريع').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/60,000/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows property count', () => {
    renderPage();
    expect(screen.getByText('عدد العقارات')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders tab triggers', () => {
    renderPage();
    expect(screen.getByText('المالية')).toBeInTheDocument();
    expect(screen.getByText('الأداء')).toBeInTheDocument();
    expect(screen.getByText('شهري')).toBeInTheDocument();
    expect(screen.getByText('مقارنة')).toBeInTheDocument();
  });

  it('shows disclosure PDF button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /الإفصاح السنوي/i })).toBeInTheDocument();
  });

  it('shows annual disclosure section in financial tab', () => {
    renderPage();
    expect(screen.getAllByText(/الإفصاح السنوي/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('إجمالي الإيرادات')).toBeInTheDocument();
  });
});
