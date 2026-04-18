/**
 * ثوابت مركزية لـ staleTime في استعلامات TanStack Query
 * تُستخدم لتوحيد سلوك التحديث حسب طبيعة البيانات
 */

/** بيانات نادرة التغيّر — عقارات، وحدات، لوائح */
export const STALE_STATIC = 5 * 60_000;

/** ملاحظة: إعدادات التطبوق تستخدم STALE_STATIC مباشرةً (تم حذف alias STALE_SETTINGS في P7). */

/** بيانات مالية — حسابات، سنوات مالية، تخصيصات، عقود */
export const STALE_FINANCIAL = 60_000;

/** بيانات حساسة للوقت — سلف، تذاكر دعم (Realtime يُبطل الكاش عند التغيير الفعلي) */
export const STALE_REALTIME = 60_000;

/** رسائل، سجلات مراجعة، إحصائيات دعم */
export const STALE_MESSAGING = 30_000;

/** ردود تذاكر، رسائل محادثة فردية (Realtime يتولى الإبطال الفوري) */
export const STALE_LIVE = 15_000;
