import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// ─── Mock all sub-hooks ───
const mockIncome = { data: undefined as unknown[] | undefined, isLoading: false, isError: false };
const mockExpenses = { data: undefined as unknown[] | undefined, isLoading: false, isError: false };
const mockAccounts = { data: undefined as unknown[] | undefined, isLoading: false };
const mockBeneficiaries = { data: undefined as unknown[] | undefined, isLoading: false };
const mockSettings = { data: undefined as Record<string, string> | undefined };

vi.mock('@/hooks/useIncome', () => ({
  useIncomeByFiscalYear: () => mockIncome,
}));
vi.mock('@/hooks/useExpenses', () => ({
  useExpensesByFiscalYear: () => mockExpenses,
}));
vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: () => mockAccounts,
}));
vi.mock('@/hooks/useBeneficiaries', () => ({
  useBeneficiariesSafe: () => mockBeneficiaries,
}));
vi.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: () => mockSettings,
}));

import { useRawFinancialData } from './useRawFinancialData';

beforeEach(() => {
  mockIncome.data = undefined;
  mockIncome.isLoading = false;
  mockIncome.isError = false;
  mockExpenses.data = undefined;
  mockExpenses.isLoading = false;
  mockExpenses.isError = false;
  mockAccounts.data = undefined;
  mockAccounts.isLoading = false;
  mockBeneficiaries.data = undefined;
  mockBeneficiaries.isLoading = false;
  mockSettings.data = undefined;
});

describe('useRawFinancialData', () => {
  it('defaults arrays to empty when data is undefined', () => {
    const { result } = renderHook(() => useRawFinancialData());
    expect(result.current.income).toEqual([]);
    expect(result.current.expenses).toEqual([]);
    expect(result.current.accounts).toEqual([]);
    expect(result.current.beneficiaries).toEqual([]);
  });

  it('returns actual data when available', () => {
    mockIncome.data = [{ id: '1', amount: 100 }];
    mockAccounts.data = [{ id: 'a1' }];
    const { result } = renderHook(() => useRawFinancialData('fy-1'));

    expect(result.current.income).toHaveLength(1);
    expect(result.current.accounts).toHaveLength(1);
  });

  it('isLoading is true when any sub-hook is loading', () => {
    mockIncome.isLoading = true;
    const { result } = renderHook(() => useRawFinancialData());
    expect(result.current.isLoading).toBe(true);
  });

  it('isLoading is false when all sub-hooks are done', () => {
    const { result } = renderHook(() => useRawFinancialData());
    expect(result.current.isLoading).toBe(false);
  });

  it('isError is true when income fetch fails', () => {
    mockIncome.isError = true;
    const { result } = renderHook(() => useRawFinancialData());
    expect(result.current.isError).toBe(true);
  });

  it('isError is true when expenses fetch fails', () => {
    mockExpenses.isError = true;
    const { result } = renderHook(() => useRawFinancialData());
    expect(result.current.isError).toBe(true);
  });

  it('isError is false when no fetch errors', () => {
    const { result } = renderHook(() => useRawFinancialData());
    expect(result.current.isError).toBe(false);
  });

  it('passes settings through', () => {
    mockSettings.data = { admin_share_percentage: '12' };
    const { result } = renderHook(() => useRawFinancialData());
    expect(result.current.settings).toEqual({ admin_share_percentage: '12' });
  });
});
