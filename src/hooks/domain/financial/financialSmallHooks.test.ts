/**
 * اختبارات خطافات المال الصغيرة: مقارنة الدخل، خريطة التخصيص، أداء العقارات.
 * البيانات وهمية بالكامل — لا اتصال بقاعدة البيانات.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const state = vi.hoisted(() => ({
  fiscalYearId: 'fy-1' as string,
  allocations: [] as Array<{ contract_id: string | null; allocated_payments: number; allocated_amount: number }>,
  allocArg: undefined as string | undefined,
  incomeRaw: undefined as unknown,
}));

vi.mock('@/contexts/FiscalYearContext', () => ({ useFiscalYear: () => ({ fiscalYearId: state.fiscalYearId }) }));
vi.mock('@/hooks/data/financial/contracts/useContractAllocations', () => ({
  useContractAllocations: (id?: string) => { state.allocArg = id; return { data: state.allocations }; },
}));
vi.mock('@/hooks/data/financial/income/useIncomeComparison', () => ({
  useIncomeComparisonRaw: () => ({ data: state.incomeRaw, isLoading: false }),
}));
vi.mock('@/hooks/domain/financial/usePropertyFinancials', () => ({
  computePropertyFinancials: ({ propertyId }: { propertyId: string }) => ({
    'p-a': { totalUnits: 4, occupancy: 75, activeAnnualRent: 40000, totalExpenses: 5000 },
    'p-b': { totalUnits: 2, occupancy: 100, activeAnnualRent: 90000, totalExpenses: 10000 },
  } as Record<string, { totalUnits: number; occupancy: number; activeAnnualRent: number; totalExpenses: number }>)[propertyId],
}));

import { useContractAllocationMap } from './useContractAllocationMap';
import { useIncomeComparison } from './useIncomeComparison';
import { usePropertyPerformance } from './usePropertyPerformance';

beforeEach(() => {
  state.fiscalYearId = 'fy-1';
  state.allocations = [];
  state.incomeRaw = undefined;
});

describe('useContractAllocationMap', () => {
  it('يبني الخريطة من تخصيصات السنة المختارة ويتجاهل الصفوف بلا عقد', () => {
    state.allocations = [
      { contract_id: 'c1', allocated_payments: 6, allocated_amount: 6000 },
      { contract_id: null, allocated_payments: 1, allocated_amount: 1 },
    ];
    const map = renderHook(() => useContractAllocationMap([])).result.current;
    expect(state.allocArg).toBe('fy-1');
    expect(map.size).toBe(1);
    expect(map.get('c1')).toEqual({ allocated_payments: 6, allocated_amount: 6000 });
  });

  it('عرض كل السنوات: خريطة فارغة ولا يطلب تخصيصات', () => {
    state.fiscalYearId = 'all';
    state.allocations = [{ contract_id: 'c1', allocated_payments: 6, allocated_amount: 6000 }];
    const map = renderHook(() => useContractAllocationMap([])).result.current;
    expect(state.allocArg).toBeUndefined();
    expect(map.size).toBe(0);
  });
});

describe('useIncomeComparison', () => {
  it('يجمع الدخل لكل سنة ويعكس الترتيب، والسنة بلا دخل = 0', () => {
    state.incomeRaw = {
      years: [{ id: 'y3', label: '2025-2026' }, { id: 'y2', label: '2024-2025' }, { id: 'y1', label: '2023-2024' }],
      income: [
        { fiscal_year_id: 'y1', amount: 1000 }, { fiscal_year_id: 'y1', amount: '500.5' },
        { fiscal_year_id: 'y3', amount: 2000 }, { fiscal_year_id: null, amount: 99999 },
      ],
    };
    const { data } = renderHook(() => useIncomeComparison()).result.current;
    expect(data).toEqual([
      { label: '2023-2024', total: 1500.5 },
      { label: '2024-2025', total: 0 },
      { label: '2025-2026', total: 2000 },
    ]);
  });

  it('بلا سنوات يُرجع مصفوفة فارغة', () => {
    state.incomeRaw = { years: [], income: [] };
    expect(renderHook(() => useIncomeComparison()).result.current.data).toEqual([]);
  });
});

describe('usePropertyPerformance', () => {
  it('صافي العقار = الإيجار − المصروفات، مرتّب تنازلياً مع إجماليات صحيحة', () => {
    const props = [
      { id: 'p-a', property_number: 'عقار أ', property_type: 'سكني' },
      { id: 'p-b', property_number: 'عقار ب', property_type: 'تجاري' },
    ];
    const { propertyPerformance, perfTotals } = renderHook(() =>
      usePropertyPerformance(props, [], [], [], true)).result.current;
    expect(propertyPerformance.map((p) => p.id)).toEqual(['p-b', 'p-a']);
    expect(propertyPerformance[0]).toMatchObject({ name: 'عقار ب', netIncome: 80000, occupancy: 100 });
    expect(propertyPerformance[1]).toMatchObject({ netIncome: 35000 });
    expect(perfTotals).toEqual({ totalUnits: 6, annualRent: 130000, totalExpenses: 15000, netIncome: 115000 });
  });
});
