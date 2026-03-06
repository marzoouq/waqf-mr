import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

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
    income: [],
    beneficiaries: [{ user_id: 'u1', name: 'مستفيد', share_percentage: 20 }],
    currentAccount: { fiscal_year: '1446-1447' },
    totalIncome: 100000,
    totalExpenses: 20000,
    netAfterExpenses: 80000,
    waqfCorpusPrevious: 0,
    vatAmount: 3000,
    netAfterVat: 77000,
    netAfterZakat: 75500,
    zakatAmount: 1500,
    adminShare: 7700,
    waqifShare: 3850,
    waqfRevenue: 65450,
    waqfCorpusManual: 5000,
    distributionsAmount: 0,
    grandTotal: 77000,
    availableAmount: 60000,
    remainingBalance: 60000,
    incomeBySource: { 'إيجار': 100000 },
    expensesByType: { 'كهرباء': 10000, 'صيانة': 10000 },
    expensesByTypeExcludingVat: { 'كهرباء': 10000, 'صيانة': 10000 },
    isLoading: false,
    isError: false,
    isAccountMissing: false,
  })),
}));

vi.mock('@/components/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/ExportMenu', () => ({ default: (props: any) => <button data-testid="export-menu">تصدير</button> }));
vi.mock('@/components/FiscalYearSelector', () => ({ default: () => <div data-testid="fiscal-year-selector" /> }));
vi.mock('@/components/NoPublishedYearsNotice', () => ({ default: () => null }));
vi.mock('@/utils/pdf', () => ({ generateAccountsPDF: vi.fn().mockResolvedValue(undefined) }));

import AccountsViewPage from './AccountsViewPage';

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AccountsViewPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('AccountsViewPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders page title', () => {
    renderPage();
    expect(screen.getByText('الحسابات الختامية')).toBeInTheDocument();
  });

  it('shows summary section', () => {
    renderPage();
    expect(screen.getByText('ملخص الحسابات')).toBeInTheDocument();
    expect(screen.getByText('إجمالي الدخل')).toBeInTheDocument();
    expect(screen.getAllByText('إجمالي المصروفات').length).toBeGreaterThan(0);
  });

  it('shows my share card', () => {
    renderPage();
    // Proportional: 20% / 20% total = 100% of 60000 = 60,000
    expect(screen.getByText(/60,000/)).toBeInTheDocument();
  });

  it('shows financial summary values', () => {
    renderPage();
    // The page shows these labels in the summary grid
    expect(screen.getByText('الصافي بعد الزكاة')).toBeInTheDocument();
    expect(screen.getByText('الإجمالي القابل للتوزيع')).toBeInTheDocument();
    expect(screen.getAllByText(/حصتي المستحقة/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows link to disclosure page', () => {
    renderPage();
    expect(screen.getByText('الإفصاح السنوي')).toBeInTheDocument();
  });
});
