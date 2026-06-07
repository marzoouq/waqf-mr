/**
 * اختبار وحدة لـ useAccountsActions — يتحقق من حراس السنة والصلاحيات.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mutateCreate = vi.fn();
const mutateClose = vi.fn();

vi.mock('@/hooks/data/financial/accounts/useAccounts', () => ({
  useCreateAccount: () => ({ mutateAsync: mutateCreate, isPending: false }),
}));
vi.mock('@/hooks/data/financial/fiscalYears/useCloseFiscalYear', () => ({
  useCloseFiscalYear: () => ({ mutateAsync: mutateClose, isPending: false }),
}));

const errorToast = vi.fn();
const successToast = vi.fn();
vi.mock('@/lib/notify', () => ({
  uiNotify: { error: (...a: unknown[]) => errorToast(...a), success: (...a: unknown[]) => successToast(...a), warning: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/services', () => ({ notifyAllBeneficiaries: vi.fn() }));

const roleRef = { current: 'admin' as 'admin' | 'beneficiary' };
vi.mock('@/hooks/auth/session/useAuthContext', () => ({
  useAuth: () => ({ role: roleRef.current }),
}));

import { useAccountsActions } from './useAccountsActions';
import type { AccountsActionsParams } from '@/types/financial/accountsActions';

const baseParams = (overrides: Partial<AccountsActionsParams> = {}): AccountsActionsParams => ({
  selectedFY: { id: 'fy-1', label: '2024-2025', status: 'active' },
  fiscalYear: '2024-2025', fiscalYearId: 'fy-1', accounts: [],
  totalIncome: 0, totalExpenses: 0, adminShare: 0, waqifShare: 0, waqfRevenue: 0,
  netAfterExpenses: 0, netAfterVat: 0, netAfterZakat: 0, grandTotal: 0,
  availableAmount: 0, remainingBalance: 0,
  contracts: [], beneficiaries: [], incomeBySource: {}, expensesByType: {},
  manualVat: 0, manualDistributions: 0, zakatAmount: 0,
  waqfCorpusManual: 0, waqfCorpusPrevious: 0,
  ...overrides,
});

beforeEach(() => {
  mutateCreate.mockReset(); mutateClose.mockReset();
  errorToast.mockReset(); successToast.mockReset();
  roleRef.current = 'admin';
});

describe('useAccountsActions', () => {
  it('handleCreateAccount يرفض بدون سنة مالية مختارة', async () => {
    const { result } = renderHook(() => useAccountsActions(baseParams({ selectedFY: null })));
    await act(async () => { await result.current.handleCreateAccount(); });
    expect(errorToast).toHaveBeenCalledWith(expect.stringContaining('سنة مالية'));
    expect(mutateCreate).not.toHaveBeenCalled();
  });

  it('handleCreateAccount ينجح مع سنة صحيحة', async () => {
    mutateCreate.mockResolvedValue({});
    const { result } = renderHook(() => useAccountsActions(baseParams()));
    await act(async () => { await result.current.handleCreateAccount(); });
    expect(mutateCreate).toHaveBeenCalledOnce();
  });

  it('handleCloseYear يرفض إن لم يكن الدور admin', async () => {
    roleRef.current = 'beneficiary';
    const { result } = renderHook(() => useAccountsActions(baseParams()));
    await act(async () => { await result.current.handleCloseYear(); });
    expect(errorToast).toHaveBeenCalledWith(expect.stringContaining('الناظر'));
    expect(mutateClose).not.toHaveBeenCalled();
  });

  it('handleCloseYear لا ينفّذ إذا كانت السنة مقفلة بالفعل', async () => {
    const { result } = renderHook(() => useAccountsActions(baseParams({ selectedFY: { id: 'fy-1', label: '2023-2024', status: 'closed' } })));
    await act(async () => { await result.current.handleCloseYear(); });
    expect(mutateClose).not.toHaveBeenCalled();
  });

  it('handleCloseYear ينجح ويستدعي RPC بالـ payload الصحيح', async () => {
    mutateClose.mockResolvedValue({ closed_label: '2024-2025' });
    const { result } = renderHook(() => useAccountsActions(baseParams({ waqfCorpusManual: 1000 })));
    await act(async () => { await result.current.handleCloseYear(); });
    expect(mutateClose).toHaveBeenCalledWith(expect.objectContaining({
      fiscalYearId: 'fy-1',
      waqfCorpusManual: 1000,
      accountData: expect.objectContaining({ fiscal_year_id: 'fy-1' }),
    }));
  });
});
