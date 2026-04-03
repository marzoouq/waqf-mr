/**
 * ثوابت معرّفات السنة المالية — بديل للقيم السحرية المبعثرة في المشروع
 */

/** السنة المالية غير جاهزة (جارٍ التحميل أو لا توجد سنة منشورة) */
export const FY_NONE = '__none__' as const;

/** عرض جميع السنوات المالية */
export const FY_ALL = 'all' as const;

/** قيمة تخطّي مؤقتة (تُستخدم عند عدم توفر سنة مقارنة بعد) */
export const FY_SKIP = '__skip__' as const;

export type FiscalYearSentinel = typeof FY_NONE | typeof FY_ALL | typeof FY_SKIP;

/** هل معرّف السنة جاهز للاستعلام؟ (ليس none ولا skip) */
export const isFyReady = (id: string | undefined): id is string =>
  !!id && id !== FY_NONE && id !== FY_SKIP;

/** هل المعرّف يمثل "جميع السنوات"؟ */
export const isFyAll = (id: string | undefined): boolean => id === FY_ALL;

/** هل المعرّف سنة مالية محددة (UUID)؟ */
export const isFySpecific = (id: string | undefined): boolean =>
  isFyReady(id) && id !== FY_ALL;
