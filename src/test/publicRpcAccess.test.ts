/**
 * Public RPC access — يضمن أن `anon` يستطيع استدعاء الدوال العامة فعلاً.
 * يحمي من تكرار انحدار 42501 الذي حدث بعد REVOKE الجماعي السابق.
 */
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const enabled = Boolean(SUPABASE_URL && SUPABASE_ANON);
const d = enabled ? describe : describe.skip;

d('Public (anon) RPC access', () => {
  const client = createClient(SUPABASE_URL!, SUPABASE_ANON!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  it('anon يستطيع استدعاء get_public_stats', async () => {
    const { error } = await client.rpc('get_public_stats');
    // يجب ألا يكون خطأ صلاحيات
    expect(error?.code).not.toBe('42501');
  });

  it('anon يستطيع استدعاء log_access_event', async () => {
    const { error } = await client.rpc('log_access_event', {
      p_event_type: 'test',
      p_target_path: '/test',
      p_device_info: 'vitest',
      p_metadata: { source: 'publicRpcAccess.test' },
    });
    expect(error?.code).not.toBe('42501');
  });
});
