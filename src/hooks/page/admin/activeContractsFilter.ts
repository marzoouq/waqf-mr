/**
 * منطق فلترة العقود حسب وضع السنة المالية — #74 من الفحص العميق
 * ────────────────────────────────────────────────────────────
 * مستخرج من inline في AdminDashboard / WaqifDashboard ليصبح قابلاً لإعادة الاستخدام
 * والاختبار (الاختبار المُقابل: `activeContractsFilter.test.ts`).
 *
 * القاعدة:
 *  - `isSpecificYear = true`  → كل العقود (نشطة + منتهية + مسودة) لرؤية تاريخية صحيحة
 *  - `isSpecificYear = false` → العقود النشطة فقط (السنة الحالية)
 *
 * مرتبط بسياسة "Universal Fiscal Filter" في memory.
 */
export interface ContractStatusLike {
  status: string;
}

export function filterRelevantContracts<T extends ContractStatusLike>(
  contracts: T[],
  isSpecificYear: boolean,
): T[] {
  return isSpecificYear ? contracts : contracts.filter((c) => c.status === 'active');
}
