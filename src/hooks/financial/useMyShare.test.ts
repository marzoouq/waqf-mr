import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockUseAuth } from '@/test/setup';

vi.mock('./useTotalBeneficiaryPercentage', () => ({
  useTotalBeneficiaryPercentage: vi.fn(() => ({ data: 100, isLoading: false })),
}));

import { renderHook } from '@testing-library/react';
import { useMyShare } from './useMyShare';
import { useTotalBeneficiaryPercentage } from '@/hooks/data/financial/useTotalBeneficiaryPercentage';

const mockPct = vi.mocked(useTotalBeneficiaryPercentage);

describe('useMyShare', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({  user: { id: 'user-1' }, session: null, role: null, loading: false, signIn: vi.fn(async () => ({ error: null })), signUp: vi.fn(async () => ({ error: null })), signOut: vi.fn(async () => {}), refreshRole: vi.fn(async () => {}) } as any);
    mockPct.mockReturnValue({ data: 100, isLoading: false } as any);
  });

  it('يحسب الحصة بشكل صحيح', () => {
    const beneficiaries = [
      { user_id: 'user-1', share_percentage: 30 },
      { user_id: 'user-2', share_percentage: 70 },
    ];
    const { result } = renderHook(() => useMyShare({ beneficiaries, availableAmount: 10000 }));
    expect(result.current.myShare).toBe(3000);
    expect(result.current.currentBeneficiary).toBe(beneficiaries[0]);
    expect(result.current.totalBenPct).toBe(100);
  });

  it('يُعيد 0 عند عدم وجود مستفيد مطابق', () => {
    mockUseAuth.mockReturnValue({  user: { id: 'user-999' }, session: null, role: null, loading: false, signIn: vi.fn(async () => ({ error: null })), signUp: vi.fn(async () => ({ error: null })), signOut: vi.fn(async () => {}), refreshRole: vi.fn(async () => {}) } as any);
    const { result } = renderHook(() => useMyShare({
      beneficiaries: [{ user_id: 'user-1', share_percentage: 30 }],
      availableAmount: 10000,
    }));
    expect(result.current.myShare).toBe(0);
    expect(result.current.currentBeneficiary).toBeUndefined();
  });

  it('يُعيد 0 عند totalBenPct = 0', () => {
    mockPct.mockReturnValue({ data: 0, isLoading: false } as any);
    const { result } = renderHook(() => useMyShare({
      beneficiaries: [{ user_id: 'user-1', share_percentage: 30 }],
      availableAmount: 10000,
    }));
    expect(result.current.myShare).toBe(0);
  });

  it('يحمي من قيم null في share_percentage و availableAmount', () => {
    const { result } = renderHook(() => useMyShare({
      beneficiaries: [{ user_id: 'user-1', share_percentage: null }],
      availableAmount: NaN,
    }));
    expect(result.current.myShare).toBe(0);
  });

  it('يمرر pctLoading', () => {
    mockPct.mockReturnValue({ data: undefined, isLoading: true } as any);
    const { result } = renderHook(() => useMyShare({
      beneficiaries: [],
      availableAmount: 0,
    }));
    expect(result.current.pctLoading).toBe(true);
  });

  it('#9: يُفضّل serverMyShare على الحساب المحلي', () => {
    const beneficiaries = [
      { user_id: 'user-1', share_percentage: 30 },
      { user_id: 'user-2', share_percentage: 70 },
    ];
    const { result } = renderHook(() => useMyShare({
      beneficiaries,
      availableAmount: 10000,
      serverMyShare: 2500,
    }));
    expect(result.current.myShare).toBe(2500);
  });

  it('#9: يعود للحساب المحلي عند غياب serverMyShare', () => {
    const beneficiaries = [{ user_id: 'user-1', share_percentage: 30 }];
    const { result } = renderHook(() => useMyShare({
      beneficiaries,
      availableAmount: 10000,
      serverMyShare: null,
    }));
    expect(result.current.myShare).toBe(3000);
  });

  it('#9: يعود للحساب المحلي عند serverMyShare = undefined', () => {
    const beneficiaries = [{ user_id: 'user-1', share_percentage: 30 }];
    const { result } = renderHook(() => useMyShare({
      beneficiaries,
      availableAmount: 10000,
      serverMyShare: undefined,
    }));
    expect(result.current.myShare).toBe(3000);
  });

  it('يحسب الحصة تناسبياً عند مجموع نسب أقل من 100', () => {
    mockPct.mockReturnValue({ data: 60, isLoading: false } as any);
    const beneficiaries = [
      { user_id: 'user-1', share_percentage: 30 },
      { user_id: 'user-2', share_percentage: 30 },
    ];
    const { result } = renderHook(() => useMyShare({ beneficiaries, availableAmount: 12000 }));
    expect(result.current.myShare).toBe(6000);
  });

  it('يحسب الحصة تناسبياً عند مجموع نسب أكبر من 100', () => {
    mockPct.mockReturnValue({ data: 150, isLoading: false } as any);
    const beneficiaries = [
      { user_id: 'user-1', share_percentage: 75 },
      { user_id: 'user-2', share_percentage: 75 },
    ];
    const { result } = renderHook(() => useMyShare({ beneficiaries, availableAmount: 9000 }));
    expect(result.current.myShare).toBe(4500);
  });

  it('يحسب حصة صغيرة تناسبياً بشكل صحيح', () => {
    mockPct.mockReturnValue({ data: 100, isLoading: false } as any);
    const beneficiaries = [{ user_id: 'user-1', share_percentage: 5 }];
    const { result } = renderHook(() => useMyShare({ beneficiaries, availableAmount: 100000 }));
    expect(result.current.myShare).toBe(5000);
  });

  it('يتعامل مع نسب عشرية (كسور)', () => {
    mockPct.mockReturnValue({ data: 100, isLoading: false } as any);
    const beneficiaries = [{ user_id: 'user-1', share_percentage: 33.33 }];
    const { result } = renderHook(() => useMyShare({ beneficiaries, availableAmount: 10000 }));
    expect(result.current.myShare).toBe(3333);
  });

  it('#9: يقبل serverMyShare = 0 كقيمة صالحة (عجز مرحّل كامل)', () => {
    const beneficiaries = [{ user_id: 'user-1', share_percentage: 30 }];
    const { result } = renderHook(() => useMyShare({
      beneficiaries,
      availableAmount: 10000,
      serverMyShare: 0,
    }));
    expect(result.current.myShare).toBe(0);
  });

  it('#9: يرفض serverMyShare = NaN ويعود للحساب المحلي', () => {
    const beneficiaries = [{ user_id: 'user-1', share_percentage: 50 }];
    const { result } = renderHook(() => useMyShare({
      beneficiaries,
      availableAmount: 8000,
      serverMyShare: NaN,
    }));
    expect(result.current.myShare).toBe(4000);
  });

  it('#9: يرفض serverMyShare = Infinity ويعود للحساب المحلي', () => {
    const beneficiaries = [{ user_id: 'user-1', share_percentage: 20 }];
    const { result } = renderHook(() => useMyShare({
      beneficiaries,
      availableAmount: 5000,
      serverMyShare: Infinity,
    }));
    expect(result.current.myShare).toBe(1000);
  });
});
