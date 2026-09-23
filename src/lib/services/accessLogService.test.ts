/**
 * اختبارات خدمة سجل الوصول — تضمن إرفاق معرّف الجلسة وعنوان IP بكل حدث،
 * وألا يكسر فشل التسجيل تدفق المستخدم.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpcMock = vi.fn();
const warnMock = vi.fn();

vi.mock('@/lib/api/rpc', () => ({ rpc: (...args: unknown[]) => rpcMock(...args) }));
vi.mock('@/lib/logger', () => ({
  logger: { warn: (...a: unknown[]) => warnMock(...a), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/monitoring/clientContext', () => ({
  getSessionId: () => 'session-123',
  getCachedIp: () => ipValue,
}));

let ipValue: string | null = '203.0.113.5';

import { logAccessEvent } from './accessLogService';

describe('logAccessEvent', () => {
  beforeEach(() => {
    rpcMock.mockReset().mockResolvedValue(undefined);
    warnMock.mockReset();
    ipValue = '203.0.113.5';
  });

  it('يُرفق معرّف الجلسة وعنوان IP بالبيانات الوصفية', async () => {
    await logAccessEvent({ event_type: 'login_success', email: 'a@b.co' });

    const call = rpcMock.mock.calls[0]!;
    const [name, params] = call as [string, Record<string, unknown>];
    expect(name).toBe('log_access_event');
    expect(params.p_event_type).toBe('login_success');
    expect(params.p_metadata).toMatchObject({ session_id: 'session-123', ip_address: '203.0.113.5' });
  });

  it('يحافظ على البيانات الوصفية المُمرَّرة من المستدعي', async () => {
    await logAccessEvent({ event_type: 'page_view', metadata: { path: '/dashboard' } });

    expect(rpcMock.mock.calls[0]![1].p_metadata).toMatchObject({
      path: '/dashboard',
      session_id: 'session-123',
    });
  });

  it('يحذف حقل IP عند عدم توفره بدل إرسال قيمة فارغة', async () => {
    ipValue = null;
    await logAccessEvent({ event_type: 'logout' });

    expect(rpcMock.mock.calls[0]![1].p_metadata).not.toHaveProperty('ip_address');
  });

  it('يُمرّر مسار الهدف ومعرّف المستخدم عند توفرهما', async () => {
    await logAccessEvent({
      event_type: 'unauthorized_access',
      user_id: 'u-1',
      target_path: '/dashboard/users',
    });

    const params = rpcMock.mock.calls[0]![1];
    expect(params.p_user_id).toBe('u-1');
    expect(params.p_target_path).toBe('/dashboard/users');
  });

  it('لا يرمي استثناءً عند فشل التسجيل ويُسجّل تحذيراً', async () => {
    rpcMock.mockRejectedValue(new Error('rls denied'));

    await expect(logAccessEvent({ event_type: 'login_failed' })).resolves.toBeUndefined();
    expect(warnMock).toHaveBeenCalled();
  });
});
