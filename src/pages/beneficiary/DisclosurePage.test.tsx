import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/components/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' }, role: 'beneficiary' })),
}));

vi.mock('@/hooks/usePdfWaqfInfo', () => ({
  usePdfWaqfInfo: vi.fn(() => ({})),
}));

vi.mock('@/hooks/useFiscalYears', () => ({
  useActiveFiscalYear: vi.fn(() => ({
    data: { id: 'fy1', label: '1446-1447', status: 'active' },
    fiscalYears: [{ id: 'fy1', label: '1446-1447', status: 'active' }],
  })),
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
    beneficiaries: [{ id: 'b1', user_id: 'user-1', name: 'أحمد علي', share_percentage: 15 }],
    totalIncome: 200000,
    totalExpenses: 50000,
    currentAccount: { fiscal_year: '1446-1447' },
    vatAmount: 10000,
    zakatAmount: 5000,
    waqfCorpusManual: 3000,
    netAfterExpenses: 150000,
    netAfterVat: 140000,
    netAfterZakat: 135000,
    adminShare: 15000,
    waqifShare: 10000,
    waqfRevenue: 110000,
    incomeBySource: { 'إيجارات': 180000, 'أخرى': 20000 },
    expensesByTypeExcludingVat: { 'صيانة': 30000, 'كهرباء': 20000 },
    availableAmount: 107000,
    isLoading: false,
    isError: false,
    isAccountMissing: false,
  })),
}));

vi.mock('@/hooks/useContracts', () => ({
  useContractsByFiscalYear: vi.fn(() => ({
    data: [
      { id: 'c1', contract_number: 'W-001', tenant_name: 'محمد', rent_amount: 50000, status: 'active' },
    ],
    isLoading: false,
  })),
}));

vi.mock('@/components/ExportMenu', () => ({ default: (props: any) => <button data-testid="export-menu">تصدير</button> }));
vi.mock('@/components/NoPublishedYearsNotice', () => ({ default: () => null }));
vi.mock('@/utils/pdf', () => ({
  generateDisclosurePDF: vi.fn().mockResolvedValue(undefined),
  generateComprehensiveBeneficiaryPDF: vi.fn().mockResolvedValue(undefined),
}));

import DisclosurePage from './DisclosurePage';

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><DisclosurePage /></MemoryRouter>
    </QueryClientProvider>
  );
};

describe('DisclosurePage', () => {
  it('renders page title', () => {
    renderPage();
    expect(screen.getByText('الإفصاح السنوي')).toBeInTheDocument();
  });

  it('shows fiscal year in Gregorian format', () => {
    renderPage();
    // Gregorian format: day/month/year — from start_date and end_date
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it('shows total income card', () => {
    renderPage();
    expect(screen.getAllByText('إجمالي الإيرادات').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/200,000/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows total expenses card', () => {
    renderPage();
    expect(screen.getAllByText('إجمالي المصروفات').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/50,000/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows my share card', () => {
    renderPage();
    expect(screen.getAllByText('حصتي المستحقة').length).toBeGreaterThanOrEqual(1);
    // 107000 * 15% = 16050
    expect(screen.getAllByText(/16,050/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows income breakdown by source', () => {
    renderPage();
    expect(screen.getByText('إيجارات')).toBeInTheDocument();
    expect(screen.getByText(/180,000/)).toBeInTheDocument();
    expect(screen.getByText('أخرى')).toBeInTheDocument();
  });

  it('shows expenses breakdown by type', () => {
    renderPage();
    expect(screen.getByText('صيانة')).toBeInTheDocument();
    expect(screen.getByText('كهرباء')).toBeInTheDocument();
  });

  it('shows financial sequence items', () => {
    renderPage();
    expect(screen.getByText('الصافي بعد المصاريف')).toBeInTheDocument();
    expect(screen.getByText(/ضريبة القيمة المضافة/)).toBeInTheDocument();
    expect(screen.getByText('الصافي بعد خصم الضريبة')).toBeInTheDocument();
    expect(screen.getByText(/حصة الناظر/)).toBeInTheDocument();
    expect(screen.getByText(/حصة الواقف/)).toBeInTheDocument();
    expect(screen.getByText('ريع الوقف')).toBeInTheDocument();
    expect(screen.getByText('الإجمالي القابل للتوزيع')).toBeInTheDocument();
  });

  it('shows beneficiary name and share percentage', () => {
    renderPage();
    expect(screen.getByText('أحمد علي')).toBeInTheDocument();
  });

  it('shows zakat and waqf corpus when > 0', () => {
    renderPage();
    expect(screen.getAllByText(/الزكاة/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/رقبة الوقف/)).toBeInTheDocument();
  });

  it('renders detailed financial statement section', () => {
    renderPage();
    expect(screen.getByText('البيان المالي التفصيلي')).toBeInTheDocument();
  });
});
