/**
 * واجهة إشعارات موحّدة للمشروع بالكامل
 * تجمع بين MutationNotify (من mutationNotify.ts) و CrudNotifications (من useCrudFactory.ts)
 * استخدم defaultNotify لإرسال إشعارات toast من أي مكان
 * يمنع تكرار نفس الرسالة خلال فترة قصيرة (dedup)
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

/** منع التكرار — يحفظ آخر رسالة مع وقتها */
const recentToasts = new Map<string, number>();
const DEDUP_MS = 2000; // 2 ثانية

function dedupToast(
  fn: (msg: string, opts?: ExternalToast) => string | number,
  msg: string,
  opts?: ExternalToast,
) {
  const now = Date.now();
  const lastTime = recentToasts.get(msg);
  if (lastTime && now - lastTime < DEDUP_MS) return;
  recentToasts.set(msg, now);
  // تنظيف الذاكرة
  if (recentToasts.size > 20) {
    for (const [key, time] of recentToasts) {
      if (now - time > DEDUP_MS) recentToasts.delete(key);
    }
  }
  fn(msg, opts);
}

/** الإشعارات الافتراضية عبر sonner — مع حماية من التكرار */
export const defaultNotify: AppNotify = {
  success: (msg, opts) => dedupToast(toast.success, msg, opts),
  error: (msg, opts) => dedupToast(toast.error, msg, opts),
  info: (msg, opts) => dedupToast(toast.info, msg, opts),
  warning: (msg, opts) => dedupToast(toast.warning, msg, opts),
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
