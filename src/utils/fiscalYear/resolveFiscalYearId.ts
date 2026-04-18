/**
 * حلّ معرّف السنة المالية النشطة (مُستخرج من FiscalYearContext في الموجة 18)
 *
 * يستبدل الـ ternary المتداخل ثلاثي المستوى بدالة نقية قابلة للاختبار.
 */
import { FY_NONE, FY_ALL } from '@/constants/fiscalYearIds';

export interface ResolveFiscalYearIdInput {
  /** هل بيانات السنوات المالية لا تزال تُحمَّل؟ */
  isLoading: boolean;
  /** هل بيانات المصادقة لا تزال تُحمَّل؟ */
  authLoading: boolean;
  /** هل المستخدم محصور بسنوات منشورة فقط (مستفيد/واقف) ولا توجد سنوات منشورة؟ */
  noPublishedYears: boolean;
  /** المعرّف المختار يدوياً (من sessionStorage أو القائمة) */
  selectedId: string;
  /** معرّف السنة النشطة من قاعدة البيانات */
  activeFyId?: string;
  /** هل المستخدم beneficiary أو waqif (يحتاج fallback لأول سنة منشورة)؟ */
  isNonAdmin: boolean;
  /** معرّف أول سنة منشورة (للـ fallback عند noPublishedYears = false) */
  firstYearId?: string;
}

/**
 * يُحدد معرّف السنة المالية الفعلي بناءً على حالة التحميل والصلاحيات.
 *
 * أولوية الترتيب:
 * 1. لا يزال يُحمّل ⇒ FY_NONE
 * 2. لا توجد سنوات منشورة (لمستخدم خارجي) ⇒ FY_NONE
 * 3. اختيار يدوي مخزَّن ⇒ selectedId
 * 4. سنة نشطة من DB ⇒ activeFyId
 * 5. مستخدم خارجي ⇒ أول سنة منشورة (أو FY_NONE)
 * 6. ناظر/محاسب ⇒ FY_ALL
 */
export function resolveFiscalYearId(input: ResolveFiscalYearIdInput): string {
  const { isLoading, authLoading, noPublishedYears, selectedId, activeFyId, isNonAdmin, firstYearId } = input;

  if (isLoading || authLoading) return FY_NONE;
  if (noPublishedYears) return FY_NONE;
  if (selectedId) return selectedId;
  if (activeFyId) return activeFyId;
  if (isNonAdmin) return firstYearId ?? FY_NONE;
  return FY_ALL;
}
