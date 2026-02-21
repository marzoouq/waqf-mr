import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdleTimeout } from './useIdleTimeout';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('useIdleTimeout', () => {
  it('initially hides warning', () => {
    const onIdle = vi.fn();
    const { result } = renderHook(() =>
      useIdleTimeout({ timeout: 10_000, warningBefore: 3_000, onIdle }),
    );
    expect(result.current.showWarning).toBe(false);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it('shows warning before timeout', () => {
    const onIdle = vi.fn();
    const { result } = renderHook(() =>
      useIdleTimeout({ timeout: 10_000, warningBefore: 3_000, onIdle }),
    );

    // Advance to warning threshold (10s - 3s = 7s)
    act(() => { vi.advanceTimersByTime(7_000); });
    expect(result.current.showWarning).toBe(true);
    expect(result.current.remaining).toBe(3); // 3 seconds left
    expect(onIdle).not.toHaveBeenCalled();
  });

  it('calls onIdle after full timeout', () => {
    const onIdle = vi.fn();
    renderHook(() =>
      useIdleTimeout({ timeout: 10_000, warningBefore: 3_000, onIdle }),
    );

    act(() => { vi.advanceTimersByTime(10_000); });
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('resets timer on user activity (mousemove)', () => {
    const onIdle = vi.fn();
    const { result } = renderHook(() =>
      useIdleTimeout({ timeout: 10_000, warningBefore: 3_000, onIdle }),
    );

    // Advance 8s (past warning at 7s)
    act(() => { vi.advanceTimersByTime(8_000); });
    expect(result.current.showWarning).toBe(true);

    // Simulate activity — resets timer
    act(() => { document.dispatchEvent(new Event('mousemove')); });
    expect(result.current.showWarning).toBe(false);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it('stayActive() resets timer and hides warning', () => {
    const onIdle = vi.fn();
    const { result } = renderHook(() =>
      useIdleTimeout({ timeout: 10_000, warningBefore: 3_000, onIdle }),
    );

    act(() => { vi.advanceTimersByTime(8_000); });
    expect(result.current.showWarning).toBe(true);

    act(() => { result.current.stayActive(); });
    expect(result.current.showWarning).toBe(false);

    // Full timeout shouldn't fire from original time
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(onIdle).not.toHaveBeenCalled();
  });

  it('uses default timeout (15 min) when not specified', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimeout({ onIdle }));

    // 14 minutes: no call
    act(() => { vi.advanceTimersByTime(14 * 60 * 1000); });
    expect(onIdle).not.toHaveBeenCalled();

    // 15 minutes: fires
    act(() => { vi.advanceTimersByTime(1 * 60 * 1000); });
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('countdown decrements remaining seconds', () => {
    const onIdle = vi.fn();
    const { result } = renderHook(() =>
      useIdleTimeout({ timeout: 5_000, warningBefore: 3_000, onIdle }),
    );

    // Trigger warning at 2s
    act(() => { vi.advanceTimersByTime(2_000); });
    expect(result.current.showWarning).toBe(true);
    expect(result.current.remaining).toBe(3);

    // After 1s countdown
    act(() => { vi.advanceTimersByTime(1_000); });
    expect(result.current.remaining).toBe(2);

    // After another 1s
    act(() => { vi.advanceTimersByTime(1_000); });
    expect(result.current.remaining).toBe(1);
  });

  it('cleans up event listeners on unmount', () => {
    const onIdle = vi.fn();
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() =>
      useIdleTimeout({ timeout: 10_000, warningBefore: 3_000, onIdle }),
    );

    unmount();

    const removedEvents = removeSpy.mock.calls.map(c => c[0]);
    expect(removedEvents).toContain('mousemove');
    expect(removedEvents).toContain('keydown');
    expect(removedEvents).toContain('touchstart');
    expect(removedEvents).toContain('scroll');
    expect(removedEvents).toContain('click');
    removeSpy.mockRestore();
  });
});
