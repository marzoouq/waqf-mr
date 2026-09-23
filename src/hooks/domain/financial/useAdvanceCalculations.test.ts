/**
 * اختبارات useMyBeneficiaryFinance — مجاميع السلف المدفوعة وأرصدة المرحّل.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/hooks/data/financial/advances/useAdvanceQueries', () => ({
  useMyBeneficiaryFinanceRaw: vi.fn(),
}));

import { renderHook } from '@testing-library/react';
import { useMyBeneficiaryFinance } from './useAdvanceCalculations';
import { useMyBeneficiaryFinanceRaw } from '@/hooks/data/financial/advances/useAdvanceQueries';

const mockRaw = vi.mocked(useMyBeneficiaryFinanceRaw);

// deno-lint-ignore-file
type Raw = Parameters<typeof mockRaw.mockReturnValue>[0];

const withData = (advances: unknown[], carryforwards: unknown[]) =>
  mockRaw.mockReturnValue({
    data: { advances, carryforwards },
    isLoading: false,
    isError: false,
  } as unknown as Raw);

const YEAR = 'fy-2025';

describe('useMyBeneficiaryFinance', () => {
  beforeEach(() => vi.clearAllMocks());

  it('يجمع السلف المدفوعة للسنة المطلوبة فقط', () => {
    withData(
      [
        { id: 'a1', status: 'paid', amount: 1000, fiscal_year_id: YEAR },
        { id: 'a2', status: 'paid', amount: 500, fiscal_year_id: YEAR },
        { id: 'a3', status: 'paid', amount: 9999, fiscal_year_id: 'fy-2024' },
        { id: 'a4', status: 'pending', amount: 700, fiscal_year_id: YEAR },
        { id: 'a5', status: 'rejected', amount: 300, fiscal_year_id: YEAR },
      ],
      [],
    );
    const { result } = renderHook(() => useMyBeneficiaryFinance('ben-1', YEAR));
    expect(result.current.data.paidAdvancesTotal).toBe(1500);
    expect(result.current.data.myAdvances).toHaveLength(5);
  });

  it('يجمع كل السلف المدفوعة عند عدم تحديد سنة', () => {
    withData(
      [
        { status: 'paid', amount: 100, fiscal_year_id: YEAR },
        { status: 'paid', amount: 200, fiscal_year_id: 'fy-2024' },
      ],
      [],
    );
    const { result } = renderHook(() => useMyBeneficiaryFinance('ben-1'));
    expect(result.current.data.paidAdvancesTotal).toBe(300);
  });

  it('يحسب رصيد المرحّل النشط للسنة الهدف ويشمل غير المحدد', () => {
    withData([], [
      { status: 'active', amount: 400, to_fiscal_year_id: YEAR },
      { status: 'active', amount: 250, to_fiscal_year_id: null },
      { status: 'active', amount: 800, to_fiscal_year_id: 'fy-2024' },
      { status: 'settled', amount: 5000, to_fiscal_year_id: YEAR },
    ]);
    const { result } = renderHook(() => useMyBeneficiaryFinance('ben-1', YEAR));
    expect(result.current.data.carryforwardBalance).toBe(650);
  });

  it('يتعامل مع قيم غير رقمية دون إنتاج NaN', () => {
    withData(
      [{ status: 'paid', amount: null, fiscal_year_id: YEAR }, { status: 'paid', amount: '300', fiscal_year_id: YEAR }],
      [{ status: 'active', amount: undefined, to_fiscal_year_id: YEAR }],
    );
    const { result } = renderHook(() => useMyBeneficiaryFinance('ben-1', YEAR));
    expect(Number.isNaN(result.current.data.paidAdvancesTotal)).toBe(false);
    expect(result.current.data.carryforwardBalance).toBe(0);
  });

  it('يرجع أصفاراً عند غياب البيانات كلياً', () => {
    mockRaw.mockReturnValue({ data: undefined, isLoading: true } as unknown as Raw);
    const { result } = renderHook(() => useMyBeneficiaryFinance(undefined, YEAR));
    expect(result.current.data.paidAdvancesTotal).toBe(0);
    expect(result.current.data.carryforwardBalance).toBe(0);
    expect(result.current.data.myAdvances).toEqual([]);
    expect(result.current.data.myCarryforwards).toEqual([]);
  });
});
