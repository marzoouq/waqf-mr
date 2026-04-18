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

// ---- Mocks ----
const signOutMock = vi.fn();
const performCleanupMock = vi.fn();
const logAccessEventMock = vi.fn().mockResolvedValue(undefined);
const loggerErrorMock = vi.fn();

let capturedOnIdle: (() => Promise<void>) | null = null;
let mockUser: { id: string } | null = { id: 'u1' };

vi.mock('@/hooks/auth/useAuthContext', () => ({
  useAuth: () => ({ user: mockUser, signOut: signOutMock }),
}));

vi.mock('@/hooks/auth/useAuthCleanup', () => ({
  useAuthCleanup: () => ({ performCleanup: performCleanupMock }),
}));

vi.mock('@/hooks/data/settings/useAppSettings', () => ({
  useAppSettings: () => ({
    getJsonSetting: <T,>(_key: string, fallback: T) => fallback,
  }),
}));

vi.mock('@/hooks/ui/useIdleTimeout', () => ({
  useIdleTimeout: (opts: { onIdle: () => Promise<void> }) => {
    capturedOnIdle = opts.onIdle;
    return { showWarning: false, remaining: 0, stayActive: vi.fn() };
  },
}));

vi.mock('@/lib/services/accessLogService', () => ({
  logAccessEvent: logAccessEventMock,
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: loggerErrorMock, warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/components/auth/IdleTimeoutWarning', () => ({
  default: () => null,
}));

// Import after mocks
import IdleTimeoutManager from './IdleTimeoutManager';

describe('IdleTimeoutManager', () => {
  let originalLocation: Location;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnIdle = null;
    mockUser = { id: 'u1' };
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
    signOutMock.mockResolvedValueOnce(undefined);
    render(<IdleTimeoutManager />);

    expect(capturedOnIdle).toBeTruthy();
    await act(async () => {
      await capturedOnIdle!();
    });

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(performCleanupMock).not.toHaveBeenCalled();
    expect(window.location.href).toBe('/auth?reason=idle');
  });

  it('عند فشل signOut: يستدعي performCleanup + logger.error ويُكمل التوجيه', async () => {
    const err = new Error('boom');
    signOutMock.mockRejectedValueOnce(err);
    render(<IdleTimeoutManager />);

    await act(async () => {
      await capturedOnIdle!();
    });

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(performCleanupMock).toHaveBeenCalledTimes(1);
    expect(loggerErrorMock).toHaveBeenCalledWith(
      expect.stringContaining('[IdleTimeout]'),
      err,
    );
    expect(window.location.href).toBe('/auth?reason=idle');
  });

  it('يستدعي logAccessEvent بـ event_type=idle_logout قبل signOut', async () => {
    signOutMock.mockResolvedValueOnce(undefined);
    render(<IdleTimeoutManager />);

    await act(async () => {
      await capturedOnIdle!();
    });

    expect(logAccessEventMock).toHaveBeenCalledTimes(1);
    expect(logAccessEventMock).toHaveBeenCalledWith({
      event_type: 'idle_logout',
      user_id: 'u1',
    });
    // ترتيب: log قبل signOut
    const logOrder = logAccessEventMock.mock.invocationCallOrder[0] ?? 0;
    const signOutOrder = signOutMock.mock.invocationCallOrder[0] ?? 0;
    expect(logOrder).toBeLessThan(signOutOrder);
    expect(logOrder).toBeGreaterThan(0);
  });

  it('بدون مستخدم: يُرجع null ولا يَرسم IdleTimeoutWarning', () => {
    mockUser = null;
    const { container } = render(<IdleTimeoutManager />);
    expect(container.firstChild).toBeNull();
  });
});
