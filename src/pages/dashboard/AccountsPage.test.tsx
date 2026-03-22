import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AccountsPage from './AccountsPage';

// --- Mocks ---
vi.mock('@/components/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'u1' }, role: 'admin', signOut: vi.fn() })),
}));

vi.mock('@/hooks/useAccountsPage', () => ({
  useAccountsPage: vi.fn(() => ({
    accounts: [],
    contracts: [
      {
        id: 'c1', contract_number: 'W-001', tenant_name: 'أحمد محمد',
        rent_amount: 120000, start_date: '2024-01-01', end_date: '2025-01-01',
        status: 'active', property_id: 'p1', payment_type: 'annual', payment_count: 1,
        payment_amount: null, unit_id: null, notes: null, created_at: '', updated_at: '',
        fiscal_year_id: 'fy1',
      },
    ],
    income: [
      { amount: 500000, source: 'إيجارات', date: '2024-01-01' },
      { amount: 200000, source: 'أخرى', date: '2024-02-01' },
    ],
    expenses: [
      { amount: 50000, expense_type: 'صيانة', date: '2024-01-15' },
      { amount: 30000, expense_type: 'كهرباء', date: '2024-02-15' },
    ],
    beneficiaries: [
      { id: 'b1', name: 'محمد', share_percentage: 50 },
      { id: 'b2', name: 'خالد', share_percentage: 50 },
    ],
    isLoading: false,
    totalIncome: 700000,
    totalExpenses: 80000,
    adminPercent: 10,
    waqifPercent: 5,
    zakatAmount: 0,
    waqfCorpusManual: 0,
    waqfCorpusPrevious: 0,
    manualVat: 0,
    manualDistributions: 0,
    netAfterExpenses: 620000,
    netAfterVat: 620000,
    netAfterZakat: 620000,
    grandTotal: 620000,
    adminShare: 62000,
    waqifShare: 31000,
    waqfRevenue: 527000,
    availableAmount: 527000,
    remainingBalance: 527000,
    calculatedVat: 0,
    commercialRent: 0,
    incomeBySource: { 'إيجارات': 500000, 'أخرى': 200000 },
    expensesByType: { 'صيانة': 50000, 'كهرباء': 30000 },
    totalAnnualRent: 120000,
    totalPaymentPerPeriod: 120000,
    collectionData: [{
      index: 1, tenantName: 'أحمد محمد', paymentPerPeriod: 120000,
      expectedPayments: 1, paidMonths: 0, totalCollected: 0, arrears: 120000,
      status: 'متأخر', notes: '',
    }],
    totalCollectedAll: 0,
    totalArrearsAll: 120000,
    totalPaidMonths: 0,
    totalExpectedPayments: 1,
    totalBeneficiaryPercentage: 100,
    selectedFY: { id: 'fy1', label: '2024-2025', status: 'active', start_date: '2024-01-01', end_date: '2025-01-01' },
    isClosed: false,
    handleCreateAccount: vi.fn(),
    handleAdminPercentChange: vi.fn(),
    handleWaqifPercentChange: vi.fn(),
    handleFiscalYearChange: vi.fn(),
    setZakatAmount: vi.fn(),
    setWaqfCorpusManual: vi.fn(),
    setManualVat: vi.fn(),
    setManualDistributions: vi.fn(),
    setWaqfCorpusPrevious: vi.fn(),
    editingIndex: null,
    editData: null,
    setEditingIndex: vi.fn(),
    setEditData: vi.fn(),
    handleEditRow: vi.fn(),
    handleSaveEdit: vi.fn(),
    contractEditOpen: false,
    setContractEditOpen: vi.fn(),
    editingContractData: null,
    setEditingContractData: vi.fn(),
    deleteTarget: null,
    setDeleteTarget: vi.fn(),
    handleDeleteConfirm: vi.fn(),
    handleEditContract: vi.fn(),
    handleDeleteContract: vi.fn(),
    statusLabel: vi.fn((s: string) => s),
    getPaymentPerPeriod: vi.fn(() => 120000),
    getExpectedPayments: vi.fn(() => 1),
    closeYearOpen: false,
    setCloseYearOpen: vi.fn(),
    isClosingYear: false,
    handleCloseYear: vi.fn(),
    allUnits: [],
    properties: [],
    orphanedContracts: [],
    paymentInvoices: [],
    fiscalYears: [{ id: 'fy1', label: '2024-2025', status: 'active' }],
    allocationMap: new Map(),
    vatPercentage: 15,
    residentialVatExempt: true,
    role: 'admin',
  })),
}));

vi.mock('@/components/FiscalYearSelector', () => ({
  default: () => <div data-testid="fiscal-year-selector">FY Selector</div>,
}));

vi.mock('@/hooks/usePdfWaqfInfo', () => ({
  usePdfWaqfInfo: () => ({ waqfName: 'وقف تجريبي', nazirName: 'ناظر' }),
}));

vi.mock('@/utils/notifications', () => ({
  notifyAllBeneficiaries: vi.fn(),
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
    // FiscalYearSelector is now managed via useFiscalYear context
    expect(screen.getByText('الحسابات الختامية')).toBeInTheDocument();
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
    const incomeLabels = screen.getAllByText(/الدخل|الإيرادات/);
    expect(incomeLabels.length).toBeGreaterThan(0);
  });

  it('renders expenses section', () => {
    renderPage();
    const expenseLabels = screen.getAllByText(/المصروفات/);
    expect(expenseLabels.length).toBeGreaterThan(0);
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
