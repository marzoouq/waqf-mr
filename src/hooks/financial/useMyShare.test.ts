import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' } })),
}));

vi.mock('./useTotalBeneficiaryPercentage', () => ({
  useTotalBeneficiaryPercentage: vi.fn(() => ({ data: 100, isLoading: false })),
}));

import { renderHook } from '@testing-library/react';
import { useMyShare } from './useMyShare';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useTotalBeneficiaryPercentage } from './useTotalBeneficiaryPercentage';

const mockAuth = useAuth as ReturnType<typeof vi.fn>;
const mockPct = useTotalBeneficiaryPercentage as ReturnType<typeof vi.fn>;

describe('useMyShare', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockPct.mockReturnValue({ data: 100, isLoading: false });
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
    mockAuth.mockReturnValue({ user: { id: 'user-999' } });
    const { result } = renderHook(() => useMyShare({
      beneficiaries: [{ user_id: 'user-1', share_percentage: 30 }],
      availableAmount: 10000,
    }));
    expect(result.current.myShare).toBe(0);
    expect(result.current.currentBeneficiary).toBeUndefined();
  });

  it('يُعيد 0 عند totalBenPct = 0', () => {
    mockPct.mockReturnValue({ data: 0, isLoading: false });
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
    mockPct.mockReturnValue({ data: undefined, isLoading: true });
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
    // القيمة من الخادم (2500) تُفضّل على الحساب المحلي (3000)
    expect(result.current.myShare).toBe(2500);
  });

  it('#9: يعود للحساب المحلي عند غياب serverMyShare', () => {
    const beneficiaries = [
      { user_id: 'user-1', share_percentage: 30 },
    ];
    const { result } = renderHook(() => useMyShare({
      beneficiaries,
      availableAmount: 10000,
      serverMyShare: null,
    }));
    expect(result.current.myShare).toBe(3000);
  });

  it('#9: يعود للحساب المحلي عند serverMyShare = undefined', () => {
    const beneficiaries = [
      { user_id: 'user-1', share_percentage: 30 },
    ];
    const { result } = renderHook(() => useMyShare({
      beneficiaries,
      availableAmount: 10000,
      serverMyShare: undefined,
    }));
    expect(result.current.myShare).toBe(3000);
  });

  // --- التوزيع التناسبي عند مجموع نسب ≠ 100 ---

  it('يحسب الحصة تناسبياً عند مجموع نسب أقل من 100', () => {
    mockPct.mockReturnValue({ data: 60, isLoading: false });
    const beneficiaries = [
      { user_id: 'user-1', share_percentage: 30 },
      { user_id: 'user-2', share_percentage: 30 },
    ];
    const { result } = renderHook(() => useMyShare({ beneficiaries, availableAmount: 12000 }));
    // 12000 * 30 / 60 = 6000
    expect(result.current.myShare).toBe(6000);
  });

  it('يحسب الحصة تناسبياً عند مجموع نسب أكبر من 100', () => {
    mockPct.mockReturnValue({ data: 150, isLoading: false });
    const beneficiaries = [
      { user_id: 'user-1', share_percentage: 75 },
      { user_id: 'user-2', share_percentage: 75 },
    ];
    const { result } = renderHook(() => useMyShare({ beneficiaries, availableAmount: 9000 }));
    // 9000 * 75 / 150 = 4500
    expect(result.current.myShare).toBe(4500);
  });

  it('يحسب حصة صغيرة تناسبياً بشكل صحيح', () => {
    mockPct.mockReturnValue({ data: 100, isLoading: false });
    const beneficiaries = [
      { user_id: 'user-1', share_percentage: 5 },
    ];
    const { result } = renderHook(() => useMyShare({ beneficiaries, availableAmount: 100000 }));
    // 100000 * 5 / 100 = 5000
    expect(result.current.myShare).toBe(5000);
  });

  it('يتعامل مع نسب عشرية (كسور)', () => {
    mockPct.mockReturnValue({ data: 100, isLoading: false });
    const beneficiaries = [
      { user_id: 'user-1', share_percentage: 33.33 },
    ];
    const { result } = renderHook(() => useMyShare({ beneficiaries, availableAmount: 10000 }));
    // 10000 * 33.33 / 100 = 3333 (مقرّب لأقرب فلسين)
    expect(result.current.myShare).toBe(3333);
  });

  // --- حالة serverMyShare = 0 (عجز مرحّل استهلك كامل الحصة) ---

  it('#9: يقبل serverMyShare = 0 كقيمة صالحة (عجز مرحّل كامل)', () => {
    const beneficiaries = [
      { user_id: 'user-1', share_percentage: 30 },
    ];
    const { result } = renderHook(() => useMyShare({
      beneficiaries,
      availableAmount: 10000,
      serverMyShare: 0,
    }));
    // القيمة 0 من الخادم تعني أن العجز المرحّل استهلك كامل الحصة
    expect(result.current.myShare).toBe(0);
  });

  it('#9: يرفض serverMyShare = NaN ويعود للحساب المحلي', () => {
    const beneficiaries = [
      { user_id: 'user-1', share_percentage: 50 },
    ];
    const { result } = renderHook(() => useMyShare({
      beneficiaries,
      availableAmount: 8000,
      serverMyShare: NaN,
    }));
    // NaN غير صالح → fallback محلي: 8000 * 50 / 100 = 4000
    expect(result.current.myShare).toBe(4000);
  });

  it('#9: يرفض serverMyShare = Infinity ويعود للحساب المحلي', () => {
    const beneficiaries = [
      { user_id: 'user-1', share_percentage: 20 },
    ];
    const { result } = renderHook(() => useMyShare({
      beneficiaries,
      availableAmount: 5000,
      serverMyShare: Infinity,
    }));
    // Infinity غير صالح → fallback: 5000 * 20 / 100 = 1000
    expect(result.current.myShare).toBe(1000);
  });
});
