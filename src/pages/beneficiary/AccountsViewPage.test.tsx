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
    zakatAmount: 1500,
    adminShare: 7700,
    waqifShare: 3850,
    waqfRevenue: 65450,
    waqfCorpusManual: 5000,
    distributionsAmount: 0,
    grandTotal: 77000,
    availableAmount: 60000,
    incomeBySource: { 'إيجار': 100000 },
    expensesByType: { 'كهرباء': 10000, 'صيانة': 10000 },
  })),
}));

vi.mock('@/hooks/useContracts', () => ({
  useContracts: vi.fn(() => ({
    data: [
      { id: 'c1', contract_number: 'W-001', tenant_name: 'أحمد', rent_amount: 50000, status: 'active', fiscal_year_id: 'fy1' },
      { id: 'c2', contract_number: 'W-002', tenant_name: 'محمد', rent_amount: 30000, status: 'expired', fiscal_year_id: 'fy1' },
    ],
    isLoading: false,
  })),
}));

vi.mock('@/components/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/ExportMenu', () => ({ default: (props: any) => <button data-testid="export-menu">تصدير</button> }));
vi.mock('@/components/FiscalYearSelector', () => ({ default: () => <div data-testid="fiscal-year-selector" /> }));
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
    // 20% of 60000 = 12000
    expect(screen.getByText(/12,000/)).toBeInTheDocument();
  });

  it('shows contracts table', () => {
    renderPage();
    expect(screen.getByText('العقود')).toBeInTheDocument();
    expect(screen.getByText('أحمد')).toBeInTheDocument();
    expect(screen.getByText('محمد')).toBeInTheDocument();
  });

  it('shows income details section', () => {
    renderPage();
    expect(screen.getByText('تفصيل الإيرادات')).toBeInTheDocument();
    expect(screen.getByText('إيجار')).toBeInTheDocument();
  });

  it('shows expenses details section', () => {
    renderPage();
    expect(screen.getByText('تفصيل المصروفات')).toBeInTheDocument();
    expect(screen.getByText('كهرباء')).toBeInTheDocument();
    expect(screen.getByText('صيانة')).toBeInTheDocument();
  });

  it('shows link to disclosure page', () => {
    renderPage();
    expect(screen.getByText('صفحة الإفصاح السنوي')).toBeInTheDocument();
  });
});
