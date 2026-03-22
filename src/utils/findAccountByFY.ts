/**
 * دالة مساعدة: البحث عن حساب حسب السنة المالية
 * UUID أولاً، ثم fallback إلى التسمية
 */
export function findAccountByFY<T extends { fiscal_year_id?: string | null; fiscal_year: string }>(
  accts: T[],
  fy: { id: string; label: string } | null
): T | null {
  if (fy) {
    return accts.find(a =>
      (fy.id && a.fiscal_year_id === fy.id) ||
      a.fiscal_year === fy.label
    ) ?? null;
  }
  return accts.length === 1 ? accts[0] : null;
}
