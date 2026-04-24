/**
 * useLogAccessEvent — هوك خفيف يُغلّف خدمة تسجيل أحداث الوصول
 *
 * الفائدة: الالتزام بقاعدة فصل الطبقات (المكونات لا تستورد من lib/services مباشرة).
 * يُرجع مرجعاً ثابتاً للدالة كي يمكن استخدامها داخل dependency arrays بأمان.
 */
import { useCallback } from 'react';
import {
  logAccessEvent,
  type AccessEventType,
} from '@/lib/services/accessLogService';

export interface LogAccessEventInput {
  event_type: AccessEventType;
  email?: string;
  user_id?: string;
  target_path?: string;
  metadata?: Record<string, unknown>;
}

export const useLogAccessEvent = () => {
  return useCallback((event: LogAccessEventInput) => logAccessEvent(event), []);
};
