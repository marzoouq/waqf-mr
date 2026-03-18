import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' } })),
}));

vi.mock('./useTotalBeneficiaryPercentage', () => ({
  useTotalBeneficiaryPercentage: vi.fn(() => ({ data: 100, isLoading: false })),
}));

import { renderHook } from '@testing-library/react';
import { useMyShare } from './useMyShare';
import { useAuth } from '@/contexts/AuthContext';
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
});
