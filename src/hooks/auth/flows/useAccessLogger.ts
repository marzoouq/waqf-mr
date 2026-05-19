/**
 * useAccessLogger — هوك صغير يلفّ logAccessEvent من lib/services
 *
 * الغرض: حفاظ على حدود المعمارية — components لا يجوز أن تستورد من
 * @/lib/services مباشرة (راجع src/lib/services/README.md). أي component
 * يحتاج تسجيل حدث وصول يستهلك هذا الهوك بدلاً من الاستيراد المباشر.
 *
 * الاستخدام:
 *   const logAccess = useAccessLogger();
 *   logAccess({ event_type: 'login_failed', metadata: { ... } });
 */
import { useCallback } from 'react';
import { logAccessEvent, type AccessEventType } from '@/lib/services/accessLogService';

export interface AccessLogPayload {
  event_type: AccessEventType;
  user_id?: string;
  target_path?: string;
  metadata?: Record<string, unknown>;
}

export function useAccessLogger() {
  return useCallback((payload: AccessLogPayload): void => {
    // fire-and-forget — logAccessEvent يبتلع الأخطاء داخلياً
    void logAccessEvent(payload);
  }, []);
}
