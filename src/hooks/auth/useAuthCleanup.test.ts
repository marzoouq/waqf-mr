/**
 * اختبارات useAuthCleanup — يضمن استدعاء كل أدوات التنظيف بالترتيب الصحيح
 * وأن فشل dynamic import للـ monitoring لا يُسبب رمي خطأ.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mocks
vi.mock('@/lib/queryClient', () => ({
  queryClient: { clear: vi.fn() },
}));

vi.mock('@/lib/storage', () => ({
  safeRemove: vi.fn(),
  safeSessionRemove: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { dismiss: vi.fn() },
}));

import { useAuthCleanup } from './useAuthCleanup';
import { queryClient } from '@/lib/queryClient';
import { safeRemove, safeSessionRemove } from '@/lib/storage';
import { toast } from 'sonner';
import { STORAGE_KEYS, CLEARABLE_STORAGE_KEYS } from '@/constants/storageKeys';

describe('useAuthCleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('يستدعي queryClient.clear() مرة واحدة', () => {
    vi.doMock('@/lib/monitoring', () => ({
      clearSlowQueries: vi.fn(),
      clearPageLoadEntries: vi.fn(),
    }));

    const { result } = renderHook(() => useAuthCleanup());
    act(() => result.current.performCleanup());

    expect(queryClient.clear).toHaveBeenCalledTimes(1);
  });

  it('يستدعي safeRemove لكل مفتاح في CLEARABLE_STORAGE_KEYS', () => {
    const { result } = renderHook(() => useAuthCleanup());
    act(() => result.current.performCleanup());

    expect(safeRemove).toHaveBeenCalledTimes(CLEARABLE_STORAGE_KEYS.length);
    CLEARABLE_STORAGE_KEYS.forEach(key => {
      expect(safeRemove).toHaveBeenCalledWith(key);
    });
  });

  it('يستدعي safeSessionRemove للمفتاحين الحساسين', () => {
    const { result } = renderHook(() => useAuthCleanup());
    act(() => result.current.performCleanup());

    expect(safeSessionRemove).toHaveBeenCalledWith(STORAGE_KEYS.FISCAL_YEAR);
    expect(safeSessionRemove).toHaveBeenCalledWith(STORAGE_KEYS.NID_LOCKED_UNTIL);
  });

  it('يستدعي toast.dismiss()', () => {
    const { result } = renderHook(() => useAuthCleanup());
    act(() => result.current.performCleanup());

    expect(toast.dismiss).toHaveBeenCalledTimes(1);
  });

  it('لا يرمي خطأ إذا فشل dynamic import للـ monitoring', async () => {
    vi.doMock('@/lib/monitoring', () => {
      throw new Error('module load failed');
    });

    const { result } = renderHook(() => useAuthCleanup());
    expect(() => act(() => result.current.performCleanup())).not.toThrow();

    // انتظر microtasks للتأكد من معالجة .catch()
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  it('performCleanup مرجع مستقر بين إعادات التصيير', () => {
    const { result, rerender } = renderHook(() => useAuthCleanup());
    const firstRef = result.current.performCleanup;
    rerender();
    expect(result.current.performCleanup).toBe(firstRef);
  });
});
