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
  { id: 'c1', contract_number: 'W-001', tenant_name: 'أحمد', rent_amount: 120000, start_date: '2024-01-01', end_date: '2025-01-01', status: 'active', property_id: 'p1', payment_type: 'annual', payment_count: 1, payment_amount: undefined, unit_id: undefined, fiscal_year_id: 'fy1', created_at: '', updated_at: '' },
  { id: 'c2', contract_number: 'W-002', tenant_name: 'خالد', rent_amount: 60000, start_date: '2024-01-01', end_date: '2025-01-01', status: 'cancelled', property_id: 'p1', payment_type: 'monthly', payment_count: 12, payment_amount: 5000, unit_id: 'u1', fiscal_year_id: 'fy1', created_at: '', updated_at: '' },
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

import { useAccountsPage } from './useAccountsPage';

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
};

describe('useAccountsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders without error and returns expected shape', () => {
    const { result } = renderHook(() => useAccountsPage(), { wrapper: createWrapper() });
    expect(result.current).not.toBeNull();
    expect(result.current.totalIncome).toBe(500000);
    expect(result.current.totalExpenses).toBe(50000);
  });

  it('filters out cancelled contracts', () => {
    const { result } = renderHook(() => useAccountsPage(), { wrapper: createWrapper() });
    const contractIds = result.current.contracts.map((c: { id: string }) => c.id);
    expect(contractIds).not.toContain('c2');
    expect(contractIds).toContain('c1');
  });

  it('statusLabel translates known statuses', () => {
    const { result } = renderHook(() => useAccountsPage(), { wrapper: createWrapper() });
    expect(result.current.statusLabel('active')).toBe('نشط');
    expect(result.current.statusLabel('expired')).toBe('منتهي');
    expect(result.current.statusLabel('cancelled')).toBe('ملغي');
    expect(result.current.statusLabel('unknown')).toBe('unknown');
  });

  it('handleAdminPercentChange rejects invalid values', () => {
    const { result } = renderHook(() => useAccountsPage(), { wrapper: createWrapper() });
    result.current.handleAdminPercentChange('150');
    expect(mockToastError).toHaveBeenCalledWith('نسبة الناظر يجب أن تكون رقماً بين 0 و 100');
  });

  it('handleAdminPercentChange rejects negative values', () => {
    const { result } = renderHook(() => useAccountsPage(), { wrapper: createWrapper() });
    result.current.handleAdminPercentChange('-5');
    expect(mockToastError).toHaveBeenCalled();
  });

  it('handleWaqifPercentChange rejects NaN', () => {
    const { result } = renderHook(() => useAccountsPage(), { wrapper: createWrapper() });
    result.current.handleWaqifPercentChange('abc');
    expect(mockToastError).toHaveBeenCalledWith('نسبة الواقف يجب أن تكون رقماً بين 0 و 100');
  });

  it('computes collectionData correctly', () => {
    const { result } = renderHook(() => useAccountsPage(), { wrapper: createWrapper() });
    expect(result.current.collectionData.length).toBe(1);
    const item = result.current.collectionData[0];
    expect(item.tenantName).toBe('أحمد');
    expect(item.paidMonths).toBe(0);
    expect(item.status).toBe('متأخر');
  });

  it('computes totalBeneficiaryPercentage', () => {
    const { result } = renderHook(() => useAccountsPage(), { wrapper: createWrapper() });
    expect(result.current.totalBeneficiaryPercentage).toBe(100);
  });

  it('getPaymentPerPeriod respects payment_amount when set', () => {
    const { result } = renderHook(() => useAccountsPage(), { wrapper: createWrapper() });
    const pp = result.current.getPaymentPerPeriod(mockContracts[0]);
    expect(pp).toBe(120000);
  });

  it('getExpectedPayments uses allocationMap when available', () => {
    const { result } = renderHook(() => useAccountsPage(), { wrapper: createWrapper() });
    const ep = result.current.getExpectedPayments(mockContracts[0]);
    expect(ep).toBe(1);
  });

  it('returns defined result object', () => {
    const { result } = renderHook(() => useAccountsPage(), { wrapper: createWrapper() });
    expect(result.current).toBeDefined();
  });

  it('computes commercialRent based on property type', () => {
    const { result } = renderHook(() => useAccountsPage(), { wrapper: createWrapper() });
    expect(result.current.commercialRent).toBe(120000);
    expect(result.current.calculatedVat).toBe(18000);
  });
});
