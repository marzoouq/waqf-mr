/**
 * خدمة تسجيل أحداث الوصول — طبقة البنية التحتية
 * مستخرجة من useAccessLog لفك الاعتماد الدائري (lib → hooks)
 */
import { rpc } from '@/lib/api/rpc';
import { logger } from '@/lib/logger';
import { getSessionId, getCachedIp } from '@/lib/monitoring/clientContext';
import type { Json } from '@/integrations/supabase/types';

export type AccessEventType =
  | 'login_failed'
  | 'login_success'
  | 'logout'
  | 'unauthorized_access'
  | 'idle_logout'
  | 'session_expired'
  | 'role_fetch'
  | 'client_error'
  | 'diagnostics_run'
  | 'page_view'
  | 'page_exit';

export const logAccessEvent = async (event: {
  event_type: AccessEventType;
  email?: string;
  user_id?: string;
  target_path?: string;
  metadata?: Record<string, unknown>;
}) => {
  try {
    // نُرفق معرّف الجلسة وعنوان IP دائماً — يستخدمهما التتبع الدقيق والحجب التلقائي
    const metadata: Record<string, unknown> = {
      ...(event.metadata ?? {}),
      session_id: getSessionId(),
    };
    const ip = getCachedIp();
    if (ip) metadata.ip_address = ip;

    await rpc('log_access_event', {
      p_event_type: event.event_type,
      p_email: event.email ?? undefined,
      p_user_id: event.user_id ?? undefined,
      p_target_path: event.target_path ?? undefined,
      p_device_info: navigator.userAgent?.substring(0, 500) ?? undefined,
      p_metadata: metadata as Json,
    });
  } catch (e) {
    // لا نكسر تدفق المستخدم — لكن نسجّل تحذيراً لقابلية التشخيص
    logger.warn('logAccessEvent failed:', e instanceof Error ? e.message : e);
  }
};
