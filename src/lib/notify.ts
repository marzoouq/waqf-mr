/**
 * واجهة إشعارات موحّدة للمشروع بالكامل
 * تجمع بين MutationNotify (من mutationNotify.ts) و CrudNotifications (من useCrudFactory.ts)
 * استخدم defaultNotify لإرسال إشعارات toast من أي مكان
 *
 * #28/#29 من تقرير الفحص: dedup يمنع تكرار نفس الرسالة خلال DEDUP_MS.
 * القيمة 2000ms مختارة عمداً لتغطية batch operations دون قمع رسائل مشروعة.
 * للاختبارات: استخدم __resetNotifyDedup() لمسح الذاكرة بين الـ specs.
 *
 * #26/#76 من الفحص العميق: تنظيف دوري كل CLEANUP_MS بدلاً من الاعتماد على
 * عتبة `size > 20`، لضمان عدم تراكم الإدخالات في حالات الـ batch الطويلة.
 */
import { toast } from 'sonner';
import type { ExternalToast } from 'sonner';
import type { CrudNotifications } from '@/types/data/crudFactory';

// re-export للتوافق العكسي مع الاستيرادات من '@/lib/notify'
export type { CrudNotifications };

/** واجهة الإشعارات الموحّدة — تدعم كلاً من الاستخدام البسيط والمتقدم */
export interface AppNotify {
  success: (msg: string, opts?: ExternalToast) => void;
  error: (msg: string, opts?: ExternalToast) => void;
  info: (msg: string, opts?: ExternalToast) => void;
  warning: (msg: string, opts?: ExternalToast) => void;
  /** إغلاق توست محدد أو جميع التوستات النشطة (#9 من تقرير P3) */
  dismissAll: (toastId?: string | number) => void;
}

/** منع التكرار — يحفظ آخر رسالة مع وقتها */
const recentToasts = new Map<string, number>();
const DEDUP_MS = 2000; // 2 ثانية — يكفي لـ batch operations دون قمع رسائل مشروعة
const CLEANUP_MS = 5000; // تنظيف دوري كل 5 ثوانٍ

let cleanupTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleCleanup() {
  if (cleanupTimer || typeof window === 'undefined') return;
  cleanupTimer = setTimeout(() => {
    const now = Date.now();
    for (const [key, time] of recentToasts) {
      if (now - time > DEDUP_MS) recentToasts.delete(key);
    }
    cleanupTimer = null;
    if (recentToasts.size > 0) scheduleCleanup();
  }, CLEANUP_MS);
}

function dedupToast(
  fn: (msg: string, opts?: ExternalToast) => string | number,
  msg: string,
  opts?: ExternalToast,
) {
  const now = Date.now();
  const lastTime = recentToasts.get(msg);
  if (lastTime && now - lastTime < DEDUP_MS) return;
  recentToasts.set(msg, now);
  scheduleCleanup();
  fn(msg, opts);
}

/** الإشعارات الافتراضية عبر sonner — مع حماية من التكرار */
export const defaultNotify: AppNotify = {
  success: (msg, opts) => dedupToast(toast.success, msg, opts),
  error: (msg, opts) => dedupToast(toast.error, msg, opts),
  info: (msg, opts) => dedupToast(toast.info, msg, opts),
  warning: (msg, opts) => dedupToast(toast.warning, msg, opts),
  dismissAll: (toastId) => toast.dismiss(toastId),
};

/**
 * واجهة مبسّطة لـ createCrudFactory — مصدر النوع في @/types/data/crudFactory
 * يُعاد تصديره أعلاه للتوافق العكسي.
 */

/** تحويل CrudNotifications إلى AppNotify كامل (مع fallback) */
export function crudNotifyAdapter(custom?: CrudNotifications): AppNotify {
  return {
    success: custom?.onSuccess ?? defaultNotify.success,
    error: custom?.onError ?? defaultNotify.error,
    info: custom?.onInfo ?? defaultNotify.info,
    warning: custom?.onWarning ?? defaultNotify.warning,
    dismissAll: defaultNotify.dismissAll,
  };
}

// إعادة تصدير للتوافق مع الاستيرادات القديمة
export type MutationNotify = AppNotify;
