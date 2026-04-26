/**
 * ثوابت التوقيت المركزية — Timing constants
 * تجمع كل قيم setTimeout/debounce/idle المستخدمة في التطبيق
 * لتسهيل الصيانة وتوحيد السلوك.
 *
 * القيم بالملي ثانية (ms) ما لم يُذكر خلاف ذلك.
 */

// ─── Debounce ───
/** تأخير البحث الفوري (global search, filters) */
export const SEARCH_DEBOUNCE_MS = 300;

// ─── Auth / Permissions ───
/** أقصى انتظار لتحميل دور المستخدم قبل عرض رسالة المهلة */
export const ROLE_RESOLUTION_TIMEOUT_MS = 5000;

// ─── Performance / Idle work ───
/**
 * تأخير prefetch مكوّن lazy في المتصفحات بدون requestIdleCallback.
 * نمنح صفحات الـ first paint أولوية قصيرة قبل البدء بالـ prefetch.
 */
export const COMPONENT_PREFETCH_FALLBACK_MS = 100;

/**
 * مهلة requestIdleCallback لـ prefetch المكوّنات
 * (تستعمل عبر option `timeout` لا setTimeout مباشرة).
 */
export const COMPONENT_PREFETCH_IDLE_TIMEOUT_MS = 1500;

/** تأجيل قياس أداء أول صفحة لتفادي التعارض مع render الأولي */
export const PAGE_PERF_INITIAL_MEASURE_DELAY_MS = 1500;

// ─── Browser actions ───
/** تأخير قبل استدعاء window.print() ليكتمل تحميل المحتوى المُحقن */
export const PRINT_WINDOW_RENDER_DELAY_MS = 500;
