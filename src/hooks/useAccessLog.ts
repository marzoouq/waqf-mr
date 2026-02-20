import { supabase } from '@/integrations/supabase/client';

export const logAccessEvent = async (event: {
  event_type: 'login_failed' | 'login_success' | 'unauthorized_access' | 'idle_logout';
  email?: string;
  user_id?: string;
  target_path?: string;
  metadata?: Record<string, unknown>;
}) => {
  try {
    await supabase.from('access_log' as any).insert({
      ...event,
      ip_info: navigator.userAgent,
    });
  } catch {
    // Silent fail - don't block user flow for logging
  }
};
