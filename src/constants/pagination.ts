/**
 * ثوابت التصفح المركزية — مصدر الحقيقة الوحيد لأحجام الصفحات (موجة 15)
 *
 * استخدم الثابت الدلالي الأنسب للسياق بدل تعريف رقم محلي:
 *  - PAGE_SIZE_LIST     → جداول قياسية (افتراضي 15)
 *  - PAGE_SIZE_GRID     → عرض شبكي بطاقات (12 = 3×4 / 4×3)
 *  - PAGE_SIZE_BENEFICIARIES → شبكة المستفيدين (9 = 3×3)
 *  - DEFAULT_PAGE_SIZE  → الافتراضي العام (10) — لا تستخدمه لجداول جديدة
 */

/** الافتراضي العام — للتوافق الخلفي فقط */
export const DEFAULT_PAGE_SIZE = 10;

/** جداول البيانات القياسية — صفوف نصية متراصة */
export const PAGE_SIZE_LIST = 15;

/** عرض شبكي للبطاقات (فواتير، سجلات بصرية) */
export const PAGE_SIZE_GRID = 12;

/** شبكة المستفيدين 3×3 */
export const PAGE_SIZE_BENEFICIARIES = 9;

/** سجل المراجعة وسجلات الوصول */
export const PAGE_SIZE_AUDIT = 15;

/**
 * الحد الأقصى لجلب السجلات المالية ضمن سنة مالية واحدة
 * (الإيرادات/المصروفات/الفواتير) — يضمن دقة الحسابات المحلية
 * بدلاً من الاعتماد على Supabase default 1000.
 * موثّق في memory: invoice-pagination-strategy.
 */
export const PER_FY_LIMIT = 2000;

// أسماء قديمة للتوافق
export const PROPERTIES_PAGE_SIZE = 9;
