import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebAuthn, isBiometricEnabled } from './useWebAuthn';

// ── Mocks ──────────────────────────────────────────────────────────

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => mockToastError(...a), success: (...a: unknown[]) => mockToastSuccess(...a) } }));

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), log: vi.fn() } }));

const mockLogAccessEvent = vi.fn();
vi.mock('@/hooks/useAccessLog', () => ({ logAccessEvent: (...a: unknown[]) => mockLogAccessEvent(...a) }));

const mockBrowserSupports = vi.fn(() => false);
const mockStartRegistration = vi.fn();
const mockStartAuthentication = vi.fn();
vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: () => mockBrowserSupports(),
  startRegistration: (...a: unknown[]) => mockStartRegistration(...a),
  startAuthentication: (...a: unknown[]) => mockStartAuthentication(...a),
}));

// Supabase mock helpers
const mockGetSession = vi.fn();
const mockSetSession = vi.fn();
const mockFunctionsInvoke = vi.fn();
const mockFrom = vi.fn();

const chainMethods = () => {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }));
  chain.delete = vi.fn(() => chain);
  return chain;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      setSession: (...a: unknown[]) => mockSetSession(...a),
    },
    functions: { invoke: (...a: unknown[]) => mockFunctionsInvoke(...a) },
    from: (...a: unknown[]) => mockFrom(...a),
  },
}));

// ── Helpers ────────────────────────────────────────────────────────

const fakeSession = { user: { id: 'u1' }, access_token: 'tok', refresh_token: 'ref' };

function makeDOMException(name: string, message = '') {
  // jsdom's DOMException may not preserve message in .message getter,
  // so we create a plain Error and override .name for reliable testing
  const err = new Error(message);
  err.name = name;
  return err;
}

// ── Tests ──────────────────────────────────────────────────────────

describe('useWebAuthn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockFrom.mockReturnValue(chainMethods());
  });

  afterEach(() => { localStorage.clear(); });

  // ── isBiometricEnabled ──

  describe('isBiometricEnabled', () => {
    it('returns false when key not set', () => {
      expect(isBiometricEnabled()).toBe(false);
    });
    it('returns true when key is "true"', () => {
      localStorage.setItem('waqf_biometric_enabled', 'true');
      expect(isBiometricEnabled()).toBe(true);
    });
  });

  // ── registerBiometric error handling ──

  describe('registerBiometric', () => {
    it('shows error when no session', async () => {
      mockBrowserSupports.mockReturnValue(true);
      const { result } = renderHook(() => useWebAuthn());
      let res: boolean | undefined;
      await act(async () => { res = await result.current.registerBiometric(); });
      expect(res).toBe(false);
      expect(mockToastError).toHaveBeenCalledWith('يرجى تسجيل الدخول أولاً');
    });

    it('handles server error on register-options', async () => {
      mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
      mockFunctionsInvoke.mockResolvedValue({ data: null, error: new Error('fail') });
      const { result } = renderHook(() => useWebAuthn());
      let res: boolean | undefined;
      await act(async () => { res = await result.current.registerBiometric(); });
      expect(res).toBe(false);
      expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('فشل في بدء عملية التسجيل'));
      expect(mockLogAccessEvent).toHaveBeenCalledWith(expect.objectContaining({
        event_type: 'login_failed',
        metadata: expect.objectContaining({ action: 'register-options', reason: 'server_error' }),
      }));
    });

    it('handles options.error from server', async () => {
      mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
      mockFunctionsInvoke.mockResolvedValue({ data: { error: 'مشكلة مخصصة' }, error: null });
      const { result } = renderHook(() => useWebAuthn());
      let res: boolean | undefined;
      await act(async () => { res = await result.current.registerBiometric(); });
      expect(res).toBe(false);
      expect(mockToastError).toHaveBeenCalledWith('مشكلة مخصصة');
    });

    it('handles NotAllowedError with timeout message', async () => {
      mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
      mockFunctionsInvoke.mockResolvedValue({ data: { challenge_id: 'c1' }, error: null });
      mockStartRegistration.mockRejectedValue(makeDOMException('NotAllowedError', 'The operation timed out'));
      const { result } = renderHook(() => useWebAuthn());
      let res: boolean | undefined;
      await act(async () => { res = await result.current.registerBiometric(); });
      expect(res).toBe(false);
      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringContaining('انتهت مهلة تسجيل البصمة'),
        expect.objectContaining({ action: expect.objectContaining({ label: 'إعادة المحاولة' }) }),
      );
      expect(mockLogAccessEvent).toHaveBeenCalledWith(expect.objectContaining({
        metadata: expect.objectContaining({ reason: 'timeout' }),
      }));
    });

    it('handles NotAllowedError without timeout (user denied)', async () => {
      mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
      mockFunctionsInvoke.mockResolvedValue({ data: { challenge_id: 'c1' }, error: null });
      mockStartRegistration.mockRejectedValue(makeDOMException('NotAllowedError', 'User denied'));
      const { result } = renderHook(() => useWebAuthn());
      await act(async () => { await result.current.registerBiometric(); });
      expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('تعذّر إكمال تسجيل البصمة'));
      expect(mockLogAccessEvent).toHaveBeenCalledWith(expect.objectContaining({
        metadata: expect.objectContaining({ reason: 'not_allowed' }),
      }));
    });

    it('handles SecurityError (non-HTTPS)', async () => {
      mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
      mockFunctionsInvoke.mockResolvedValue({ data: { challenge_id: 'c1' }, error: null });
      mockStartRegistration.mockRejectedValue(makeDOMException('SecurityError'));
      const { result } = renderHook(() => useWebAuthn());
      await act(async () => { await result.current.registerBiometric(); });
      expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('HTTPS'));
      expect(mockLogAccessEvent).toHaveBeenCalledWith(expect.objectContaining({
        metadata: expect.objectContaining({ reason: 'security_error' }),
      }));
    });

    it('handles InvalidStateError (already registered)', async () => {
      mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
      mockFunctionsInvoke.mockResolvedValue({ data: { challenge_id: 'c1' }, error: null });
      mockStartRegistration.mockRejectedValue(makeDOMException('InvalidStateError'));
      const { result } = renderHook(() => useWebAuthn());
      await act(async () => { await result.current.registerBiometric(); });
      expect(mockToastError).toHaveBeenCalledWith('هذا الجهاز مسجل مسبقاً');
      expect(mockLogAccessEvent).toHaveBeenCalledWith(expect.objectContaining({
        metadata: expect.objectContaining({ reason: 'already_registered' }),
      }));
    });

    it('handles AbortError', async () => {
      mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
      mockFunctionsInvoke.mockResolvedValue({ data: { challenge_id: 'c1' }, error: null });
      mockStartRegistration.mockRejectedValue(makeDOMException('AbortError'));
      const { result } = renderHook(() => useWebAuthn());
      await act(async () => { await result.current.registerBiometric(); });
      expect(mockToastError).toHaveBeenCalledWith('تم إلغاء عملية تسجيل البصمة');
      expect(mockLogAccessEvent).toHaveBeenCalledWith(expect.objectContaining({
        metadata: expect.objectContaining({ reason: 'aborted' }),
      }));
    });

    it('handles network/fetch error with retry', async () => {
      mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
      mockFunctionsInvoke.mockResolvedValue({ data: { challenge_id: 'c1' }, error: null });
      mockStartRegistration.mockRejectedValue(new Error('Failed to fetch'));
      const { result } = renderHook(() => useWebAuthn());
      await act(async () => { await result.current.registerBiometric(); });
      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringContaining('خطأ في الاتصال بالخادم'),
        expect.objectContaining({ action: expect.objectContaining({ label: 'إعادة المحاولة' }) }),
      );
      expect(mockLogAccessEvent).toHaveBeenCalledWith(expect.objectContaining({
        metadata: expect.objectContaining({ reason: 'network_error' }),
      }));
    });

    it('handles unknown error', async () => {
      mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
      mockFunctionsInvoke.mockResolvedValue({ data: { challenge_id: 'c1' }, error: null });
      mockStartRegistration.mockRejectedValue(new Error('something weird'));
      const { result } = renderHook(() => useWebAuthn());
      await act(async () => { await result.current.registerBiometric(); });
      expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('حدث خطأ أثناء تسجيل البصمة'));
      expect(mockLogAccessEvent).toHaveBeenCalledWith(expect.objectContaining({
        metadata: expect.objectContaining({ reason: 'unknown' }),
      }));
    });

    it('handles verification failure', async () => {
      mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
      mockFunctionsInvoke
        .mockResolvedValueOnce({ data: { challenge_id: 'c1' }, error: null })
        .mockResolvedValueOnce({ data: { verified: false }, error: null });
      mockStartRegistration.mockResolvedValue({ id: 'cred1' });
      const { result } = renderHook(() => useWebAuthn());
      let res: boolean | undefined;
      await act(async () => { res = await result.current.registerBiometric(); });
      expect(res).toBe(false);
      expect(mockToastError).toHaveBeenCalledWith('فشل في تسجيل البصمة');
    });
  });

  // ── authenticateWithBiometric error handling ──

  describe('authenticateWithBiometric', () => {
    it('handles server error on auth-options', async () => {
      mockFunctionsInvoke.mockResolvedValue({ data: null, error: new Error('fail') });
      const { result } = renderHook(() => useWebAuthn());
      let res: boolean | undefined;
      await act(async () => { res = await result.current.authenticateWithBiometric(); });
      expect(res).toBe(false);
      expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('فشل في بدء عملية المصادقة'));
    });

    it('handles NotAllowedError with timeout', async () => {
      mockFunctionsInvoke.mockResolvedValue({ data: { challenge_id: 'c1' }, error: null });
      mockStartAuthentication.mockRejectedValue(makeDOMException('NotAllowedError', 'timeout'));
      const { result } = renderHook(() => useWebAuthn());
      await act(async () => { await result.current.authenticateWithBiometric(); });
      expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('انتهت مهلة المصادقة'));
      expect(mockLogAccessEvent).toHaveBeenCalledWith(expect.objectContaining({
        metadata: expect.objectContaining({ reason: 'timeout' }),
      }));
    });

    it('handles NotAllowedError (cancelled)', async () => {
      mockFunctionsInvoke.mockResolvedValue({ data: { challenge_id: 'c1' }, error: null });
      mockStartAuthentication.mockRejectedValue(makeDOMException('NotAllowedError', 'user cancelled'));
      const { result } = renderHook(() => useWebAuthn());
      await act(async () => { await result.current.authenticateWithBiometric(); });
      expect(mockToastError).toHaveBeenCalledWith('تم إلغاء عملية البصمة');
    });

    it('handles AbortError', async () => {
      mockFunctionsInvoke.mockResolvedValue({ data: { challenge_id: 'c1' }, error: null });
      mockStartAuthentication.mockRejectedValue(makeDOMException('AbortError'));
      const { result } = renderHook(() => useWebAuthn());
      await act(async () => { await result.current.authenticateWithBiometric(); });
      expect(mockToastError).toHaveBeenCalledWith('تم إلغاء عملية المصادقة بالبصمة');
      expect(mockLogAccessEvent).toHaveBeenCalledWith(expect.objectContaining({
        metadata: expect.objectContaining({ reason: 'aborted' }),
      }));
    });

    it('handles network error', async () => {
      mockFunctionsInvoke.mockResolvedValue({ data: { challenge_id: 'c1' }, error: null });
      mockStartAuthentication.mockRejectedValue(new Error('network error'));
      const { result } = renderHook(() => useWebAuthn());
      await act(async () => { await result.current.authenticateWithBiometric(); });
      expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('خطأ في الاتصال'));
      expect(mockLogAccessEvent).toHaveBeenCalledWith(expect.objectContaining({
        metadata: expect.objectContaining({ reason: 'network_error' }),
      }));
    });

    it('handles unknown error', async () => {
      mockFunctionsInvoke.mockResolvedValue({ data: { challenge_id: 'c1' }, error: null });
      mockStartAuthentication.mockRejectedValue(new Error('weird'));
      const { result } = renderHook(() => useWebAuthn());
      await act(async () => { await result.current.authenticateWithBiometric(); });
      expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('حدث خطأ أثناء المصادقة بالبصمة'));
    });

    it('handles verification failure', async () => {
      mockFunctionsInvoke
        .mockResolvedValueOnce({ data: { challenge_id: 'c1' }, error: null })
        .mockResolvedValueOnce({ data: { verified: false }, error: null });
      mockStartAuthentication.mockResolvedValue({ id: 'cred1' });
      const { result } = renderHook(() => useWebAuthn());
      let res: boolean | undefined;
      await act(async () => { res = await result.current.authenticateWithBiometric(); });
      expect(res).toBe(false);
      expect(mockToastError).toHaveBeenCalledWith('فشل في التحقق من البصمة');
    });

    it('handles missing tokens in response', async () => {
      mockFunctionsInvoke
        .mockResolvedValueOnce({ data: { challenge_id: 'c1' }, error: null })
        .mockResolvedValueOnce({ data: { verified: true }, error: null });
      mockStartAuthentication.mockResolvedValue({ id: 'cred1' });
      const { result } = renderHook(() => useWebAuthn());
      let res: boolean | undefined;
      await act(async () => { res = await result.current.authenticateWithBiometric(); });
      expect(res).toBe(false);
      expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('لم يتم استلام بيانات الجلسة'));
    });

    it('handles session set error', async () => {
      mockFunctionsInvoke
        .mockResolvedValueOnce({ data: { challenge_id: 'c1' }, error: null })
        .mockResolvedValueOnce({ data: { verified: true, access_token: 'a', refresh_token: 'r' }, error: null });
      mockStartAuthentication.mockResolvedValue({ id: 'cred1' });
      mockSetSession.mockResolvedValue({ error: new Error('session fail') });
      const { result } = renderHook(() => useWebAuthn());
      let res: boolean | undefined;
      await act(async () => { res = await result.current.authenticateWithBiometric(); });
      expect(res).toBe(false);
      expect(mockToastError).toHaveBeenCalledWith('فشل في إنشاء الجلسة');
    });

    it('succeeds with valid tokens', async () => {
      mockFunctionsInvoke
        .mockResolvedValueOnce({ data: { challenge_id: 'c1' }, error: null })
        .mockResolvedValueOnce({ data: { verified: true, access_token: 'a', refresh_token: 'r' }, error: null });
      mockStartAuthentication.mockResolvedValue({ id: 'cred1' });
      mockSetSession.mockResolvedValue({ error: null });
      const { result } = renderHook(() => useWebAuthn());
      let res: boolean | undefined;
      await act(async () => { res = await result.current.authenticateWithBiometric(); });
      expect(res).toBe(true);
      expect(mockToastSuccess).toHaveBeenCalledWith('تم تسجيل الدخول بالبصمة بنجاح');
      expect(mockLogAccessEvent).toHaveBeenCalledWith(expect.objectContaining({
        event_type: 'login_success',
      }));
    });
  });

  // ── fetchCredentials ──

  describe('fetchCredentials', () => {
    it('returns empty when no session', async () => {
      const { result } = renderHook(() => useWebAuthn());
      let creds: unknown[] | undefined;
      await act(async () => { creds = await result.current.fetchCredentials(); });
      expect(creds).toEqual([]);
    });
  });
});
