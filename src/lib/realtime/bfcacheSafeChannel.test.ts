/**
 * اختبارات useBfcacheSafeChannel
 *
 * يغطي: lifecycle (init/teardown)، استعادة من bfcache (pageshow.persisted)،
 * وتوقف الاتصال عند pagehide.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// موكات قنوات Realtime
const mockChannel = {
  subscribe: vi.fn((cb?: (status: string) => void) => {
    cb?.('SUBSCRIBED');
    return mockChannel;
  }),
  on: vi.fn(() => mockChannel),
  topic: 'realtime:test-channel',
};

vi.mock('@/lib/realtime/channelFactory', () => ({
  createRealtimeChannel: vi.fn(() => mockChannel),
  removeRealtimeChannel: vi.fn(),
  getRealtimeChannels: vi.fn(() => []),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { useBfcacheSafeChannel } from './bfcacheSafeChannel';
import * as factory from '@/lib/realtime/channelFactory';

beforeEach(() => {
  vi.clearAllMocks();
  mockChannel.subscribe.mockImplementation((cb?: (status: string) => void) => {
    cb?.('SUBSCRIBED');
    return mockChannel;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useBfcacheSafeChannel', () => {
  it('ينشئ القناة عند التفعيل ويستدعي subscribeFn', () => {
    const subscribeFn = vi.fn();
    renderHook(() => useBfcacheSafeChannel('test-channel', subscribeFn, true));

    expect(factory.createRealtimeChannel).toHaveBeenCalledWith('test-channel');
    expect(subscribeFn).toHaveBeenCalledWith(mockChannel);
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('لا ينشئ القناة عند enabled=false', () => {
    const subscribeFn = vi.fn();
    renderHook(() => useBfcacheSafeChannel('test-channel', subscribeFn, false));

    expect(factory.createRealtimeChannel).not.toHaveBeenCalled();
    expect(subscribeFn).not.toHaveBeenCalled();
  });

  it('يزيل القناة عند unmount', () => {
    const subscribeFn = vi.fn();
    const { unmount } = renderHook(() =>
      useBfcacheSafeChannel('test-channel', subscribeFn, true),
    );

    unmount();
    expect(factory.removeRealtimeChannel).toHaveBeenCalled();
  });

  it('يعيد إنشاء القناة عند pageshow.persisted=true (استعادة bfcache)', () => {
    const subscribeFn = vi.fn();
    renderHook(() => useBfcacheSafeChannel('test-channel', subscribeFn, true));
    vi.mocked(factory.createRealtimeChannel).mockClear();

    act(() => {
      const event = new Event('pageshow') as PageTransitionEvent;
      Object.defineProperty(event, 'persisted', { value: true });
      window.dispatchEvent(event);
    });

    expect(factory.createRealtimeChannel).toHaveBeenCalledWith('test-channel');
  });

  it('لا يعيد إنشاء القناة عند pageshow.persisted=false', () => {
    const subscribeFn = vi.fn();
    renderHook(() => useBfcacheSafeChannel('test-channel', subscribeFn, true));
    vi.mocked(factory.createRealtimeChannel).mockClear();

    act(() => {
      const event = new Event('pageshow') as PageTransitionEvent;
      Object.defineProperty(event, 'persisted', { value: false });
      window.dispatchEvent(event);
    });

    expect(factory.createRealtimeChannel).not.toHaveBeenCalled();
  });

  it('يهدم القناة عند pagehide', () => {
    const subscribeFn = vi.fn();
    renderHook(() => useBfcacheSafeChannel('test-channel', subscribeFn, true));
    vi.mocked(factory.removeRealtimeChannel).mockClear();

    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });

    expect(factory.removeRealtimeChannel).toHaveBeenCalled();
  });

  it('يعيد المحاولة عند CHANNEL_ERROR (لا يرمي)', () => {
    const subscribeFn = vi.fn();
    mockChannel.subscribe.mockImplementationOnce((cb?: (status: string) => void) => {
      cb?.('CHANNEL_ERROR');
      return mockChannel;
    });

    expect(() => {
      renderHook(() => useBfcacheSafeChannel('test-channel', subscribeFn, true));
    }).not.toThrow();
  });
});
