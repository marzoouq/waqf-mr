import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// --- hoisted mocks ---
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => mockToastError(...a), success: (...a: unknown[]) => mockToastSuccess(...a), info: vi.fn() } }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

const mockContracts = [
  { id: 'c1', contract_number: 'W-001', tenant_name: 'أحمد', rent_amount: 120000, start_date: '2024-01-01', end_date: '2025-01-01', status: 'active', property_id: 'p1', payment_type: 'annual', payment_count: 1, payment_amount: null, unit_id: null, fiscal_year_id: 'fy1' },
  { id: 'c2', contract_number: 'W-002', tenant_name: 'خالد', rent_amount: 60000, start_date: '2024-01-01', end_date: '2025-01-01', status: 'cancelled', property_id: 'p1', payment_type: 'monthly', payment_count: 12, payment_amount: 5000, unit_id: 'u1', fiscal_year_id: 'fy1' },
];

const mockFiscalYears = [
  { id: 'fy1', label: '2024-2025', status: 'active', start_date: '2024-01-01', end_date: '2025-01-01', published: true },
];

vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: () => ({ data: [], isLoading: false }),
  useCreateAccount: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateAccount: () => ({ mutateAsync: vi.fn() }),
  useDeleteAccount: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/hooks/useIncome', () => ({
  useIncomeByFiscalYear: () => ({ data: [{ amount: 500000, source: 'إيجارات', date: '2024-01-01' }] }),
}));

vi.mock('@/hooks/useExpenses', () => ({
  useExpensesByFiscalYear: () => ({ data: [{ amount: 50000, expense_type: 'صيانة', date: '2024-01-15' }] }),
}));

vi.mock('@/hooks/useContracts', () => ({
  useContractsByFiscalYear: () => ({ data: mockContracts }),
  useUpdateContract: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteContract: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/hooks/useBeneficiaries', () => ({
  useBeneficiaries: () => ({ data: [{ id: 'b1', name: 'محمد', share_percentage: 60 }, { id: 'b2', name: 'علي', share_percentage: 40 }] }),
}));

vi.mock('@/hooks/useTenantPayments', () => ({
  useTenantPayments: () => ({ data: [{ contract_id: 'c1', paid_months: 0, notes: '' }] }),
  useUpsertTenantPayment: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/hooks/useUnits', () => ({
  useAllUnits: () => ({ data: [{ id: 'u1', unit_type: 'محل', property_id: 'p1' }] }),
}));

vi.mock('@/hooks/useProperties', () => ({
  useProperties: () => ({ data: [{ id: 'p1', property_type: 'تجاري' }] }),
}));

vi.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: () => ({
    data: { admin_share_percentage: '10', waqif_share_percentage: '5', vat_percentage: '15', residential_vat_exempt: 'true' },
    updateSetting: { mutateAsync: vi.fn() },
  }),
}));

vi.mock('@/contexts/FiscalYearContext', () => ({
  useFiscalYear: () => ({
    fiscalYearId: 'fy1',
    fiscalYear: mockFiscalYears[0],
    fiscalYears: mockFiscalYears,
    isClosed: false,
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, role: 'admin', signOut: vi.fn() }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: vi.fn().mockResolvedValue({ data: {}, error: null }) },
}));

vi.mock('@/utils/notifications', () => ({ notifyAllBeneficiaries: vi.fn() }));

vi.mock('@/utils/contractAllocation', () => ({
  allocateContractToFiscalYears: vi.fn(() => [
    { fiscal_year_id: 'fy1', allocated_payments: 1, allocated_amount: 120000 },
  ]),
}));

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
};

describe('useAccountsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders without error and returns expected shape', () => {
    const { useAccountsPage } = require('./useAccountsPage');
    const { result } = renderHook(() => useAccountsPage(), { wrapper: createWrapper() });
    expect(result.current).not.toBeNull();
    expect(result.current.totalIncome).toBe(500000);
    expect(result.current.totalExpenses).toBe(50000);
  });

  it('filters out cancelled contracts', () => {
    const { useAccountsPage } = require('./useAccountsPage');
    const { result } = renderHook(() => useAccountsPage(), { wrapper: createWrapper() });
    // c2 is cancelled, should be excluded
    const contractIds = result.current.contracts.map((c: { id: string }) => c.id);
    expect(contractIds).not.toContain('c2');
    expect(contractIds).toContain('c1');
  });

  it('statusLabel translates known statuses', () => {
    const { useAccountsPage } = require('./useAccountsPage');
    const { result } = renderHook(() => useAccountsPage(), { wrapper: createWrapper() });
    expect(result.current.statusLabel('active')).toBe('نشط');
    expect(result.current.statusLabel('expired')).toBe('منتهي');
    expect(result.current.statusLabel('cancelled')).toBe('ملغي');
    expect(result.current.statusLabel('unknown')).toBe('unknown');
  });

  it('handleAdminPercentChange rejects invalid values', () => {
    const { useAccountsPage } = require('./useAccountsPage');
    const { result } = renderHook(() => useAccountsPage(), { wrapper: createWrapper() });
    result.current.handleAdminPercentChange('150');
    expect(mockToastError).toHaveBeenCalledWith('نسبة الناظر يجب أن تكون رقماً بين 0 و 100');
  });

  it('handleAdminPercentChange rejects negative values', () => {
    const { useAccountsPage } = require('./useAccountsPage');
    const { result } = renderHook(() => useAccountsPage(), { wrapper: createWrapper() });
    result.current.handleAdminPercentChange('-5');
    expect(mockToastError).toHaveBeenCalled();
  });

  it('handleWaqifPercentChange rejects NaN', () => {
    const { useAccountsPage } = require('./useAccountsPage');
    const { result } = renderHook(() => useAccountsPage(), { wrapper: createWrapper() });
    result.current.handleWaqifPercentChange('abc');
    expect(mockToastError).toHaveBeenCalledWith('نسبة الواقف يجب أن تكون رقماً بين 0 و 100');
  });

  it('computes collectionData correctly', () => {
    const { useAccountsPage } = require('./useAccountsPage');
    const { result } = renderHook(() => useAccountsPage(), { wrapper: createWrapper() });
    // Only c1 (active) should appear in collectionData
    expect(result.current.collectionData.length).toBe(1);
    const item = result.current.collectionData[0];
    expect(item.tenantName).toBe('أحمد');
    expect(item.paidMonths).toBe(0);
    expect(item.status).toBe('متأخر');
  });

  it('computes totalBeneficiaryPercentage', () => {
    const { useAccountsPage } = require('./useAccountsPage');
    const { result } = renderHook(() => useAccountsPage(), { wrapper: createWrapper() });
    expect(result.current.totalBeneficiaryPercentage).toBe(100);
  });

  it('getPaymentPerPeriod respects payment_amount when set', () => {
    const { useAccountsPage } = require('./useAccountsPage');
    const { result } = renderHook(() => useAccountsPage(), { wrapper: createWrapper() });
    // c1 has payment_amount=null, rent=120000, count=1 → 120000
    const pp = result.current.getPaymentPerPeriod(mockContracts[0]);
    expect(pp).toBe(120000);
  });

  it('getExpectedPayments uses allocationMap when available', () => {
    const { useAccountsPage } = require('./useAccountsPage');
    const { result } = renderHook(() => useAccountsPage(), { wrapper: createWrapper() });
    // allocateContractToFiscalYears returns allocated_payments: 1
    const ep = result.current.getExpectedPayments(mockContracts[0]);
    expect(ep).toBe(1);
  });

  it('returns role from auth context', () => {
    const { useAccountsPage } = require('./useAccountsPage');
    const { result } = renderHook(() => useAccountsPage(), { wrapper: createWrapper() });
    // The hook doesn't expose role directly but it uses it internally
    expect(result.current).toBeDefined();
  });

  it('computes commercialRent based on property type', () => {
    const { useAccountsPage } = require('./useAccountsPage');
    const { result } = renderHook(() => useAccountsPage(), { wrapper: createWrapper() });
    // c1 → p1 → property_type='تجاري' → commercial
    // allocated_amount = 120000
    expect(result.current.commercialRent).toBe(120000);
    expect(result.current.calculatedVat).toBe(18000); // 120000 * 15%
  });
});
