import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AccountsPage from './AccountsPage';

// --- Mocks ---
vi.mock('@/components/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: () => ({ data: [], isLoading: false }),
  useCreateAccount: () => ({ mutateAsync: vi.fn() }),
  useDeleteAccount: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/hooks/useIncome', () => ({
  useIncomeByFiscalYear: () => ({
    data: [
      { amount: 500000, source: 'إيجارات', date: '2024-01-01' },
      { amount: 200000, source: 'أخرى', date: '2024-02-01' },
    ],
  }),
}));

vi.mock('@/hooks/useExpenses', () => ({
  useExpensesByFiscalYear: () => ({
    data: [
      { amount: 50000, expense_type: 'صيانة', date: '2024-01-15' },
      { amount: 30000, expense_type: 'كهرباء', date: '2024-02-15' },
    ],
  }),
}));

vi.mock('@/hooks/useContracts', () => ({
  useContracts: () => ({
    data: [
      {
        id: 'c1', contract_number: 'W-001', tenant_name: 'أحمد محمد',
        rent_amount: 120000, start_date: '2024-01-01', end_date: '2025-01-01',
        status: 'active', property_id: 'p1', payment_type: 'annual', payment_count: 1,
        payment_amount: null, unit_id: null, notes: null, created_at: '', updated_at: '',
        fiscal_year_id: 'fy1',
      },
    ],
  }),
  useUpdateContract: () => ({ mutateAsync: vi.fn() }),
  useDeleteContract: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/hooks/useBeneficiaries', () => ({
  useBeneficiaries: () => ({
    data: [
      { id: 'b1', name: 'محمد', share_percentage: 50 },
      { id: 'b2', name: 'خالد', share_percentage: 50 },
    ],
  }),
}));

vi.mock('@/hooks/useTenantPayments', () => ({
  useTenantPayments: () => ({ data: [] }),
  useUpsertTenantPayment: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/hooks/useUnits', () => ({
  useAllUnits: () => ({ data: [] }),
}));

vi.mock('@/hooks/useProperties', () => ({
  useProperties: () => ({ data: [] }),
}));

vi.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: () => ({ data: { admin_share_percentage: '10', waqif_share_percentage: '5' } }),
}));

vi.mock('@/hooks/useFiscalYears', () => ({
  useActiveFiscalYear: () => ({
    data: { id: 'fy1', label: '2024-2025', status: 'active', start_date: '2024-01-01', end_date: '2025-01-01' },
    fiscalYears: [{ id: 'fy1', label: '2024-2025', status: 'active', start_date: '2024-01-01', end_date: '2025-01-01' }],
  }),
  useFiscalYears: () => ({ data: [] }),
}));

vi.mock('@/hooks/usePdfWaqfInfo', () => ({
  usePdfWaqfInfo: () => ({ waqfName: 'وقف تجريبي', nazirName: 'ناظر' }),
}));

vi.mock('@/utils/notifications', () => ({
  notifyAllBeneficiaries: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      upsert: () => ({ error: null }),
      update: () => ({ eq: () => ({ error: null }) }),
      insert: () => ({ select: () => ({ single: () => ({ data: { id: 'new' }, error: null }) }) }),
      select: () => ({ eq: () => ({ maybeSingle: () => ({ data: null }) }) }),
    }),
  },
}));

vi.mock('@/components/FiscalYearSelector', () => ({
  default: () => <div data-testid="fiscal-year-selector">FY Selector</div>,
}));

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AccountsPage />
      </BrowserRouter>
    </QueryClientProvider>,
  );
};

describe('AccountsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders page title', () => {
    renderPage();
    expect(screen.getByText('الحسابات الختامية')).toBeInTheDocument();
  });

  it('renders fiscal year selector', () => {
    renderPage();
    expect(screen.getByTestId('fiscal-year-selector')).toBeInTheDocument();
  });

  it('renders create account button', () => {
    renderPage();
    expect(screen.getByText('إنشاء حساب ختامي')).toBeInTheDocument();
  });

  it('renders contracts table section', () => {
    renderPage();
    const tenants = screen.getAllByText('أحمد محمد');
    expect(tenants.length).toBeGreaterThanOrEqual(1);
  });

  it('renders income section with totals', () => {
    renderPage();
    expect(screen.getByText('إيجارات')).toBeInTheDocument();
  });

  it('renders expenses section', () => {
    renderPage();
    expect(screen.getByText('صيانة')).toBeInTheDocument();
    expect(screen.getByText('كهرباء')).toBeInTheDocument();
  });

  it('renders beneficiaries section with names', () => {
    renderPage();
    // Beneficiary names appear in distribution table
    const mohammeds = screen.getAllByText('محمد');
    expect(mohammeds.length).toBeGreaterThan(0);
  });

  it('renders summary cards', () => {
    renderPage();
    // Look for financial summary labels that exist in the rendered output
    const incomeLabels = screen.getAllByText(/الدخل/);
    expect(incomeLabels.length).toBeGreaterThan(0);
  });
});
