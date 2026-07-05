/**
 * ثوابت مركزية لـ staleTime في استعلامات TanStack Query
 * تُستخدم لتوحيد سلوك التحديث حسب طبيعة البيانات
 */

/** بيانات نادرة التغيّر — عقارات، وحدات، لوائح */
export const STALE_STATIC = 15 * 60_000;

/** ملاحظة: إعدادات التطبوق تستخدم STALE_STATIC مباشرةً (تم حذف alias STALE_SETTINGS في P7). */

/** بيانات مالية — حسابات، سنوات مالية، تخصيصات، عقود */
export const STALE_FINANCIAL = 60_000;

/** بيانات حساسة للوقت — سلف، تذاكر دعم (Realtime يُبطل الكاش عند التغيير الفعلي) */
export const STALE_REALTIME = 60_000;

/** رسائل، سجلات مراجعة، إحصائيات دعم */
export const STALE_MESSAGING = 30_000;

/** ردود تذاكر، رسائل محادثة فردية (Realtime يتولى الإبطال الفوري) */
export const STALE_LIVE = 15_000;

/** بيانات عامة (إحصائيات الهبوط، محتوى للزوار) — تتغير ببطء */
export const STALE_PUBLIC = 5 * 60_000;

/** بيانات لوحات القيادة — مشتقة وتستفيد من تخزين قصير */
export const STALE_DASHBOARD = 30_000;

/** بيانات مرجعية ثابتة (الأدوار، الإعدادات الجامدة) */
export const STALE_REFERENCE = 15 * 60_000;

/** سجلات تاريخية (audit_log, access_log, client_errors) — لا تتغير لحظياً */
export const STALE_AUDIT = 2 * 60_000;
