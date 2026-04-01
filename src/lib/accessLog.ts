import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface AccessLogEvent {
  event_type: 'login_failed' | 'login_success' | 'logout' | 'unauthorized_access' | 'idle_logout' | 'role_fetch' | 'client_error' | 'diagnostics_run';
  email?: string;
  user_id?: string;
  target_path?: string;
  metadata?: Record<string, unknown>;
}

const getDeviceInfo = () => {
  if (typeof navigator === 'undefined') return undefined;
  return navigator.userAgent?.substring(0, 500) ?? undefined;
};

export const logAccessEvent = async (event: AccessLogEvent) => {
  try {
    await supabase.rpc('log_access_event', {
      p_event_type: event.event_type,
      p_email: event.email ?? undefined,
      p_user_id: event.user_id ?? undefined,
      p_target_path: event.target_path ?? undefined,
      p_device_info: getDeviceInfo(),
      p_metadata: (event.metadata ?? {}) as Json,
    });
  } catch {
    // Silent fail - don't block user flow for logging
  }
};
