/**
 * اختبارات سياق العميل — معرّف الجلسة، تخزين IP، وحالة الحجب.
 * تغطي الانحدار الذي عطّل حجب العناوين سابقاً (فقدان دالة client-context).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invokeMock(...args) } },
}));
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import {
  getCachedIp,
  getSessionId,
  resetClientContext,
  resolveClientContext,
} from './clientContext';

describe('clientContext', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    sessionStorage.clear();
    resetClientContext();
  });

  it('يُنشئ معرّف جلسة ثابتاً لكل تبويب', () => {
    const first = getSessionId();
    expect(first).toBeTruthy();
    expect(getSessionId()).toBe(first);
    expect(sessionStorage.getItem('activity_session_id')).toBe(first);
  });

  it('يجلب عنوان IP وحالة الحجب من الخادم ويخزّنهما', async () => {
    invokeMock.mockResolvedValue({ data: { ip: '203.0.113.5', blocked: false, reason: null }, error: null });

    const ctx = await resolveClientContext();

    expect(invokeMock).toHaveBeenCalledWith('client-context', { body: {} });
    expect(ctx).toEqual({ ip: '203.0.113.5', blocked: false, blockReason: null });
    expect(getCachedIp()).toBe('203.0.113.5');
  });

  it('ينقل حالة الحجب وسببها كما يقرّرها الخادم', async () => {
    invokeMock.mockResolvedValue({
      data: { ip: '198.51.100.9', blocked: true, reason: 'محاولات دخول متكررة' },
      error: null,
    });

    const ctx = await resolveClientContext();

    expect(ctx.blocked).toBe(true);
    expect(ctx.blockReason).toBe('محاولات دخول متكررة');
  });

  it('لا يستدعي الخادم أكثر من مرة لنفس الجلسة', async () => {
    invokeMock.mockResolvedValue({ data: { ip: '203.0.113.5', blocked: false }, error: null });

    await resolveClientContext();
    await resolveClientContext();

    expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  it('يدمج الطلبات المتوازية في نداء واحد', async () => {
    invokeMock.mockResolvedValue({ data: { ip: '203.0.113.5', blocked: false }, error: null });

    const [a, b] = await Promise.all([resolveClientContext(), resolveClientContext()]);

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
  });

  it('يعيد الجلب عند force=true', async () => {
    invokeMock.mockResolvedValue({ data: { ip: '203.0.113.5', blocked: false }, error: null });

    await resolveClientContext();
    await resolveClientContext(true);

    expect(invokeMock).toHaveBeenCalledTimes(2);
  });

  it('لا يحجب المستخدم عند فشل الدالة (fail-open) ويحتفظ بآخر IP معروف', async () => {
    sessionStorage.setItem('activity_client_ip', '192.0.2.44');
    invokeMock.mockResolvedValue({ data: null, error: new Error('Function not found') });

    const ctx = await resolveClientContext();

    expect(ctx.blocked).toBe(false);
    expect(ctx.ip).toBe('192.0.2.44');
  });

  it('لا يحجب المستخدم عند انقطاع الشبكة', async () => {
    invokeMock.mockRejectedValue(new Error('network down'));

    const ctx = await resolveClientContext();

    expect(ctx).toEqual({ ip: null, blocked: false, blockReason: null });
  });

  it('resetClientContext يُفرغ الذاكرة المؤقتة داخل العملية', async () => {
    invokeMock.mockResolvedValue({ data: { ip: '203.0.113.5', blocked: true, reason: 'r' }, error: null });
    await resolveClientContext();

    resetClientContext();
    invokeMock.mockResolvedValue({ data: { ip: '203.0.113.5', blocked: false, reason: null }, error: null });
    const ctx = await resolveClientContext();

    expect(ctx.blocked).toBe(false);
    expect(invokeMock).toHaveBeenCalledTimes(2);
  });
});
