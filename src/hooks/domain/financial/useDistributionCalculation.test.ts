/**
 * اختبارات useDistributionCalculation — تجميع السلف والمرحّلات ومجاميع التوزيع.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/hooks/data/financial/advances/useDistributionAdvances', () => ({
  usePaidAdvances: vi.fn(),
  useActiveCarryforwards: vi.fn(),
}));

import { renderHook } from '@testing-library/react';
import { useDistributionCalculation } from './useDistributionCalculation';
import {
  usePaidAdvances,
  useActiveCarryforwards,
} from '@/hooks/data/financial/advances/useDistributionAdvances';

const mockAdvances = vi.mocked(usePaidAdvances);
const mockCarryforwards = vi.mocked(useActiveCarryforwards);

type QueryLike = Parameters<typeof mockAdvances.mockReturnValue>[0];
const asQuery = (data: unknown[]) => ({ data, isLoading: false }) as unknown as QueryLike;

const beneficiaries = [
  { id: 'b1', name: 'مستفيد أول', share_percentage: 50 },
  { id: 'b2', name: 'مستفيد ثان', share_percentage: 50 },
];

const YEAR = 'fy-2025';

describe('useDistributionCalculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdvances.mockReturnValue(asQuery([]));
    mockCarryforwards.mockReturnValue(asQuery([]));
  });

  it('يوزّع المبلغ المتاح كاملاً دون فقد هللة', () => {
    const { result } = renderHook(() => useDistributionCalculation(beneficiaries, 10000.01, YEAR, true));
    const sumGross = result.current.distributions.reduce((s, d) => s + d.share_amount, 0);
    expect(sumGross).toBeCloseTo(10000.01, 2);
    expect(result.current.distributions).toHaveLength(2);
  });

  it('يخصم السلف المدفوعة من نصيب صاحبها فقط', () => {
    mockAdvances.mockReturnValue(asQuery([{ beneficiary_id: 'b1', amount: 1000 }]));
    const { result } = renderHook(() => useDistributionCalculation(beneficiaries, 10000, YEAR, true));
    const b1 = result.current.distributions.find((d) => d.beneficiary_id === 'b1');
    const b2 = result.current.distributions.find((d) => d.beneficiary_id === 'b2');
    expect(b1?.advances_paid).toBe(1000);
    expect(b2?.advances_paid).toBe(0);
    expect(result.current.totalAdvances).toBe(1000);
  });

  it('يجمع عدة سلف لنفس المستفيد', () => {
    mockAdvances.mockReturnValue(asQuery([
      { beneficiary_id: 'b1', amount: 300 },
      { beneficiary_id: 'b1', amount: 200 },
    ]));
    const { result } = renderHook(() => useDistributionCalculation(beneficiaries, 10000, YEAR, true));
    expect(result.current.totalAdvances).toBe(500);
  });

  it('يخصم المرحّل النشط ويحسب مجموعه', () => {
    mockCarryforwards.mockReturnValue(asQuery([
      { beneficiary_id: 'b2', amount: 400 },
      { beneficiary_id: 'b2', amount: 100 },
    ]));
    const { result } = renderHook(() => useDistributionCalculation(beneficiaries, 10000, YEAR, true));
    expect(result.current.totalCarryforward).toBe(500);
  });

  it('يرفع علم العجز عندما تتجاوز الخصومات النصيب', () => {
    mockAdvances.mockReturnValue(asQuery([{ beneficiary_id: 'b1', amount: 999999 }]));
    const { result } = renderHook(() => useDistributionCalculation(beneficiaries, 1000, YEAR, true));
    expect(result.current.hasDeficit).toBe(true);
    expect(result.current.totalDeficit).toBeGreaterThan(0);
  });

  it('لا عجز ولا صافي سالب في الحالة الطبيعية', () => {
    const { result } = renderHook(() => useDistributionCalculation(beneficiaries, 10000, YEAR, true));
    expect(result.current.hasDeficit).toBe(false);
    expect(result.current.totalDeficit).toBe(0);
    for (const d of result.current.distributions) {
      expect(d.net_amount).toBeGreaterThanOrEqual(0);
    }
  });

  it('يتعامل مع قائمة مستفيدين فارغة أو مبلغ صفري', () => {
    const empty = renderHook(() => useDistributionCalculation([], 10000, YEAR, true));
    expect(empty.result.current.distributions).toEqual([]);
    expect(empty.result.current.totalNet).toBe(0);

    const zero = renderHook(() => useDistributionCalculation(beneficiaries, 0, YEAR, true));
    expect(zero.result.current.totalNet).toBe(0);
  });

  it('يمرّر حالة الفتح والسنة لطبقة البيانات (لا جلب عند الإغلاق)', () => {
    renderHook(() => useDistributionCalculation(beneficiaries, 10000, YEAR, false));
    expect(mockAdvances).toHaveBeenCalledWith(YEAR, false);
    expect(mockCarryforwards).toHaveBeenCalledWith(YEAR, false);
  });
});
