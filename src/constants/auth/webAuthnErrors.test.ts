import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockToastError = vi.fn();
const mockLogAccessEvent = vi.fn();
const mockLoggerError = vi.fn();

vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args) },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: (...args: unknown[]) => mockLoggerError(...args) },
}));

vi.mock('@/lib/accessLog', () => ({
  logAccessEvent: (...args: unknown[]) => mockLogAccessEvent(...args),
}));

function setNavigator(userAgent: string, maxTouchPoints = 0) {
  Object.defineProperty(window, 'navigator', {
    configurable: true,
    value: {
      userAgent,
      maxTouchPoints,
    },
  });
}

describe('webAuthnErrors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    setNavigator('Mozilla/5.0', 0);
  });

  it('يسجل خطأ المصادقة ويعرض رسالة timeout المناسبة', async () => {
    const { handleAuthenticationError } = await import('./webAuthnErrors');

    const err = new Error('timeout while authenticating');
    err.name = 'NotAllowedError';

    handleAuthenticationError(err);

    expect(mockLoggerError).toHaveBeenCalledWith(
      'WebAuthn authentication error:',
      'timeout while authenticating',
      err,
    );
    expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('انتهت مهلة المصادقة'));
    expect(mockLogAccessEvent).toHaveBeenCalledWith(expect.objectContaining({
      event_type: 'login_failed',
      metadata: expect.objectContaining({ action: 'authenticate', reason: 'timeout' }),
    }));
  });

  it('يعيد اسم iPad لأجهزة iPadOS التي تعلن نفسها كـ Macintosh', async () => {
    const { getDeviceName } = await import('./webAuthnErrors');

    setNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 5);

    expect(getDeviceName()).toBe('iPad');
  });

  it('يعيد اسماً افتراضياً آمناً عند غياب navigator', async () => {
    const { getDeviceName } = await import('./webAuthnErrors');

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: undefined,
    });

    expect(getDeviceName()).toBe('جهاز غير معروف');
  });
});
