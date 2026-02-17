import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/components/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/FiscalYearSelector', () => ({ default: () => <div>FiscalYearSelector</div> }));
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

vi.mock('@/hooks/useFiscalYears', () => ({
  useActiveFiscalYear: vi.fn(() => ({
    data: { id: 'fy-1', label: '1446-1447هـ' },
    fiscalYears: [{ id: 'fy-1', label: '1446-1447هـ' }],
    isLoading: false,
  })),
}));

vi.mock('@/hooks/useProperties', () => ({
  useProperties: vi.fn(() => ({
    data: [
      { id: 'p1', property_number: '101', property_type: 'عمارة', location: 'الرياض', area: 500 },
      { id: 'p2', property_number: '102', property_type: 'شقة', location: 'جدة', area: 200 },
    ],
    isLoading: false,
  })),
}));

vi.mock('@/hooks/useContracts', () => ({
  useContracts: vi.fn(() => ({
    data: [
      { id: 'c1', contract_number: 'W-001', tenant_name: 'أحمد', rent_amount: 30000, status: 'active', start_date: '2024-01-01', end_date: '2025-01-01', fiscal_year_id: 'fy-1' },
      { id: 'c2', contract_number: 'W-002', tenant_name: 'محمد', rent_amount: 20000, status: 'expired', start_date: '2023-01-01', end_date: '2024-01-01', fiscal_year_id: 'fy-1' },
    ],
    isLoading: false,
  })),
}));

vi.mock('@/hooks/useUnits', () => ({
  useAllUnits: vi.fn(() => ({
    data: [
      { id: 'u1', unit_number: '1', status: 'مؤجرة', property_id: 'p1' },
      { id: 'u2', unit_number: '2', status: 'شاغرة', property_id: 'p1' },
    ],
    isLoading: false,
  })),
}));

vi.mock('@/hooks/useFinancialSummary', () => ({
  useFinancialSummary: vi.fn(() => ({
    income: [{ id: 'i1', amount: 30000, date: '2024-03-15', source: 'إيجار' }],
    expenses: [{ id: 'e1', amount: 5000, date: '2024-03-20', expense_type: 'صيانة' }],
    beneficiaries: [{ id: 'b1', name: 'فهد', share_percentage: 50 }, { id: 'b2', name: 'سارة', share_percentage: 50 }],
    totalIncome: 30000,
    totalExpenses: 5000,
    adminShare: 2500,
    waqifShare: 2500,
    waqfRevenue: 20000,
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
    expect(screen.getByText(/مرحباً بك في نظام إدارة الوقف/)).toBeInTheDocument();
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
    expect(screen.getByText('1')).toBeInTheDocument();
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

  it('shows admin and waqif shares', () => {
    renderPage();
    expect(screen.getByText('حصة الناظر')).toBeInTheDocument();
    const shareValues = screen.getAllByText(/2,500/);
    expect(shareValues.length).toBeGreaterThan(0);
    expect(screen.getByText('حصة الواقف')).toBeInTheDocument();
  });

  it('shows beneficiaries count', () => {
    renderPage();
    expect(screen.getByText('عدد المستفيدين')).toBeInTheDocument();
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
    expect(screen.getByText('أحمد')).toBeInTheDocument();
    expect(screen.getByText('W-001')).toBeInTheDocument();
  });

  it('shows print button', () => {
    renderPage();
    expect(screen.getByText('طباعة')).toBeInTheDocument();
  });
});
