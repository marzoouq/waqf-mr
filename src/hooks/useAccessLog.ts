import { supabase } from '@/integrations/supabase/client';

export const logAccessEvent = async (event: {
  event_type: 'login_failed' | 'login_success' | 'unauthorized_access' | 'idle_logout' | 'role_fetch';
  email?: string;
  user_id?: string;
  target_path?: string;
  metadata?: Record<string, unknown>;
}) => {
  try {
    await supabase.rpc('log_access_event', {
      p_event_type: event.event_type,
      p_email: event.email ?? null,
      p_user_id: event.user_id ?? null,
      p_target_path: event.target_path ?? null,
      p_ip_info: navigator.userAgent?.substring(0, 500) ?? null,
      p_metadata: (event.metadata ?? {}) as unknown as Record<string, never>,
    });
  } catch {
    // Silent fail - don't block user flow for logging
  }
};
