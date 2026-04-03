/**
 * واجهة إشعارات موحّدة للمشروع بالكامل
 * تجمع بين MutationNotify (من mutationNotify.ts) و CrudNotifications (من useCrudFactory.ts)
 * استخدم defaultNotify لإرسال إشعارات toast من أي مكان
 */
import { toast } from 'sonner';
import type { ExternalToast } from 'sonner';

/** واجهة الإشعارات الموحّدة — تدعم كلاً من الاستخدام البسيط والمتقدم */
export interface AppNotify {
  success: (msg: string, opts?: ExternalToast) => void;
  error: (msg: string, opts?: ExternalToast) => void;
  info: (msg: string, opts?: ExternalToast) => void;
  warning: (msg: string, opts?: ExternalToast) => void;
}

/** الإشعارات الافتراضية عبر sonner — يمكن استبدالها في الاختبارات */
export const defaultNotify: AppNotify = {
  success: (msg, opts) => toast.success(msg, opts),
  error: (msg, opts) => toast.error(msg, opts),
  info: (msg, opts) => toast.info(msg, opts),
  warning: (msg, opts) => toast.warning(msg, opts),
};

/**
 * واجهة مبسّطة لـ createCrudFactory — متوافقة مع AppNotify
 * تُستخدم لتمرير إشعارات مخصصة لكل factory
 */
export interface CrudNotifications {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  onInfo?: (message: string) => void;
}

/** تحويل CrudNotifications إلى AppNotify كامل (مع fallback) */
export function crudNotifyAdapter(custom?: CrudNotifications): AppNotify {
  return {
    success: custom?.onSuccess ?? defaultNotify.success,
    error: custom?.onError ?? defaultNotify.error,
    info: custom?.onInfo ?? defaultNotify.info,
    warning: defaultNotify.warning,
  };
}

// إعادة تصدير للتوافق مع الاستيرادات القديمة
export type MutationNotify = AppNotify;
