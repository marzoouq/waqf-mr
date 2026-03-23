import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// حفظ الأصل
const origNotification = globalThis.Notification;

describe('usePushNotifications', () => {
  beforeEach(() => {
    vi.resetModules();
    // تعريف Notification وهمي
    const mockNotification = vi.fn() as unknown as typeof Notification;
    Object.defineProperty(mockNotification, 'permission', { value: 'default', writable: true, configurable: true });
    (mockNotification as unknown as { requestPermission: () => Promise<NotificationPermission> }).requestPermission = vi.fn().mockResolvedValue('granted');
    Object.defineProperty(globalThis, 'Notification', { value: mockNotification, writable: true, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'Notification', { value: origNotification, writable: true, configurable: true });
  });

  it('returns isSupported true when Notification exists', async () => {
    const { usePushNotifications } = await import('./usePushNotifications');
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.isSupported).toBe(true);
  });

  it('returns current permission state', async () => {
    const { usePushNotifications } = await import('./usePushNotifications');
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.permission).toBe('default');
  });

  it('requestPermission returns permission result', async () => {
    const { usePushNotifications } = await import('./usePushNotifications');
    const { result } = renderHook(() => usePushNotifications());
    let perm: NotificationPermission = 'default';
    await act(async () => {
      perm = await result.current.requestPermission();
    });
    expect(perm).toBe('granted');
  });

  it('showNotification does not throw when permission is not granted', async () => {
    const { usePushNotifications } = await import('./usePushNotifications');
    const { result } = renderHook(() => usePushNotifications());
    expect(() => result.current.showNotification('اختبار')).not.toThrow();
  });
});
