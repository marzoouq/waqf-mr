/**
 * IdleTimeoutManager — اختبار وحدة
 *
 * يحمي ضد الانحدار في مسار idle logout:
 *  - عند نجاح signOut: التوجيه يحدث بدون استدعاء performCleanup
 *  - عند فشل signOut: performCleanup يُستدعى دفاعياً + logger.error
 *  - logAccessEvent يُستدعى دائماً قبل signOut
 *  - بدون مستخدم: المكوّن يُرجع null
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

const h = vi.hoisted(() => ({
  signOutMock: vi.fn(),
  performCleanupMock: vi.fn(),
  logAccessEventMock: vi.fn().mockResolvedValue(undefined),
  loggerErrorMock: vi.fn(),
  capturedOnIdle: null as null | (() => Promise<void>),
  mockUser: { id: 'u1' } as { id: string } | null,
}));

vi.mock('@/hooks/auth/useAuthContext', () => ({
  useAuth: () => ({ user: h.mockUser, signOut: h.signOutMock }),
}));

vi.mock('@/hooks/auth/useAuthCleanup', () => ({
  useAuthCleanup: () => ({ performCleanup: h.performCleanupMock }),
}));

vi.mock('@/hooks/data/settings/useAppSettings', () => ({
  useAppSettings: () => ({
    getJsonSetting: <T,>(_key: string, fallback: T) => fallback,
  }),
}));

vi.mock('@/hooks/ui/useIdleTimeout', () => ({
  useIdleTimeout: (opts: { onIdle: () => Promise<void> }) => {
    h.capturedOnIdle = opts.onIdle;
    return { showWarning: false, remaining: 0, stayActive: vi.fn() };
  },
}));

vi.mock('@/lib/services/accessLogService', () => ({
  logAccessEvent: h.logAccessEventMock,
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: h.loggerErrorMock, warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/components/auth/IdleTimeoutWarning', () => ({
  default: () => null,
}));

import IdleTimeoutManager from './IdleTimeoutManager';

describe('IdleTimeoutManager', () => {
  let originalLocation: Location;

  beforeEach(() => {
    h.signOutMock.mockReset();
    h.performCleanupMock.mockReset();
    h.logAccessEventMock.mockReset().mockResolvedValue(undefined);
    h.loggerErrorMock.mockReset();
    h.capturedOnIdle = null;
    h.mockUser = { id: 'u1' };
    originalLocation = window.location;
    // @ts-expect-error - test override
    delete window.location;
    // @ts-expect-error - test override
    window.location = { href: '' };
  });

  afterEach(() => {
    // @ts-expect-error - test restore
    window.location = originalLocation;
  });

  it('عند نجاح signOut: لا يستدعي performCleanup ويوجّه إلى /auth?reason=idle', async () => {
    h.signOutMock.mockResolvedValueOnce(undefined);
    render(<IdleTimeoutManager />);

    expect(h.capturedOnIdle).toBeTruthy();
    await act(async () => {
      await h.capturedOnIdle!();
    });

    expect(h.signOutMock).toHaveBeenCalledTimes(1);
    expect(h.performCleanupMock).not.toHaveBeenCalled();
    expect(window.location.href).toBe('/auth?reason=idle');
  });

  it('عند فشل signOut: يستدعي performCleanup + logger.error ويُكمل التوجيه', async () => {
    const err = new Error('boom');
    h.signOutMock.mockRejectedValueOnce(err);
    render(<IdleTimeoutManager />);

    await act(async () => {
      await h.capturedOnIdle!();
    });

    expect(h.signOutMock).toHaveBeenCalledTimes(1);
    expect(h.performCleanupMock).toHaveBeenCalledTimes(1);
    expect(h.loggerErrorMock).toHaveBeenCalledWith(
      expect.stringContaining('[IdleTimeout]'),
      err,
    );
    expect(window.location.href).toBe('/auth?reason=idle');
  });

  it('يستدعي logAccessEvent بـ event_type=idle_logout قبل signOut', async () => {
    h.signOutMock.mockResolvedValueOnce(undefined);
    render(<IdleTimeoutManager />);

    await act(async () => {
      await h.capturedOnIdle!();
    });

    expect(h.logAccessEventMock).toHaveBeenCalledTimes(1);
    expect(h.logAccessEventMock).toHaveBeenCalledWith({
      event_type: 'idle_logout',
      user_id: 'u1',
    });
    const logOrder = h.logAccessEventMock.mock.invocationCallOrder[0] ?? 0;
    const signOutOrder = h.signOutMock.mock.invocationCallOrder[0] ?? 0;
    expect(logOrder).toBeGreaterThan(0);
    expect(logOrder).toBeLessThan(signOutOrder);
  });

  it('بدون مستخدم: يُرجع null', () => {
    h.mockUser = null;
    const { container } = render(<IdleTimeoutManager />);
    expect(container.firstChild).toBeNull();
  });
});
