import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export const logAccessEvent = async (event: {
  event_type: 'login_failed' | 'login_success' | 'logout' | 'unauthorized_access' | 'idle_logout' | 'role_fetch' | 'client_error' | 'diagnostics_run';
  email?: string;
  user_id?: string;
  target_path?: string;
  metadata?: Record<string, unknown>;
}) => {
  try {
    await supabase.rpc('log_access_event', {
      p_event_type: event.event_type,
      p_email: event.email ?? undefined,
      p_user_id: event.user_id ?? undefined,
      p_target_path: event.target_path ?? undefined,
      p_device_info: navigator.userAgent?.substring(0, 500) ?? undefined,
      p_metadata: (event.metadata ?? {}) as Json,
    });
  } catch {
    // Silent fail - don't block user flow for logging
  }
};
