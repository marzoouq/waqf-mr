/**
 * اختبارات useDistributionsPage — distributionRatio + dialog state
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const accountsState = {
  availableAmount: 100_000,
  manualDistributions: 25_000,
  fiscalYearId: 'fy1',
  beneficiaries: [{ id: 'b1', share_percentage: 50 }],
  isClosed: false, isLoading: false,
  selectedFY: { id: 'fy1', label: '1446-1447' },
  fiscalYear: '1446-1447',
  totalIncome: 200_000, totalExpenses: 50_000,
  waqfRevenue: 150_000, adminShare: 10_000, waqifShare: 5_000,
  remainingBalance: 75_000,
  totalBeneficiaryPercentage: 100, currentAccount: { id: 'a1' },
};

vi.mock('./useAccountsPage', () => ({
  useAccountsPage: () => accountsState,
}));

vi.mock('@/hooks/domain/financial/useDistributionCalculation', () => ({
  useDistributionCalculation: (_b: unknown, available: number) => ({
    distributions: [{ id: 'b1', net: available }],
    totalNet: available, totalAdvances: 0, totalCarryforward: 0,
    totalDeficit: 0, hasDeficit: false,
  }),
}));

vi.mock('@/hooks/auth/session/useAuthContext', () => ({
  useAuth: () => ({ role: 'admin' }),
}));

const loadHook = async () => (await import('./useDistributionsPage')).useDistributionsPage;

describe('useDistributionsPage', () => {
  beforeEach(() => { vi.clearAllMocks(); accountsState.availableAmount = 100_000; accountsState.manualDistributions = 25_000; });

  it('يحسب distributionRatio = 25%', async () => {
    const h = await loadHook();
    const { result } = renderHook(() => h());
    expect(result.current.distributionRatio).toBe(25);
  });

  it('distributionRatio = 0 عندما availableAmount = 0', async () => {
    accountsState.availableAmount = 0;
    const h = await loadHook();
    const { result } = renderHook(() => h());
    expect(result.current.distributionRatio).toBe(0);
  });

  it('يمرّر distributions من useDistributionCalculation', async () => {
    const h = await loadHook();
    const { result } = renderHook(() => h());
    expect(result.current.distributions).toEqual([{ id: 'b1', net: 100_000 }]);
    expect(result.current.totalNet).toBe(100_000);
  });

  it('dialogOpen قابل للتبديل', async () => {
    const h = await loadHook();
    const { result } = renderHook(() => h());
    expect(result.current.dialogOpen).toBe(false);
    act(() => result.current.setDialogOpen(true));
    expect(result.current.dialogOpen).toBe(true);
  });

  it('يكشف role من useAuth', async () => {
    const h = await loadHook();
    const { result } = renderHook(() => h());
    expect(result.current.role).toBe('admin');
  });
});
