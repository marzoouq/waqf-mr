import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: mockRpc,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('logAccessEvent', () => {
  it('يستدعي supabase.rpc بالبارامترات الصحيحة', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const { logAccessEvent } = await import('./useAccessLog');

    await logAccessEvent({
      event_type: 'login_success',
      email: 'test@test.com',
      user_id: 'u1',
      target_path: '/dashboard',
      metadata: { source: 'test' },
    });

    expect(mockRpc).toHaveBeenCalledWith('log_access_event', {
      p_event_type: 'login_success',
      p_email: 'test@test.com',
      p_user_id: 'u1',
      p_target_path: '/dashboard',
      p_device_info: expect.any(String),
      p_metadata: { source: 'test' },
    });
  });

  it('يمرر metadata فارغة عند عدم التحديد', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const { logAccessEvent } = await import('./useAccessLog');

    await logAccessEvent({ event_type: 'logout' });

    expect(mockRpc).toHaveBeenCalledWith('log_access_event', expect.objectContaining({
      p_event_type: 'logout',
      p_email: undefined,
      p_user_id: undefined,
      p_target_path: undefined,
      p_metadata: {},
    }));
  });

  it('لا يرمي خطأ عند فشل RPC (silent fail)', async () => {
    mockRpc.mockRejectedValue(new Error('RPC failed'));
    const { logAccessEvent } = await import('./useAccessLog');

    // يجب أن لا يرمي
    await expect(logAccessEvent({ event_type: 'login_failed' })).resolves.toBeUndefined();
  });
});
