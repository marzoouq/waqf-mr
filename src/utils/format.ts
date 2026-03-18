/**
 * دوال التنسيق الموحّدة للنظام
 * الهدف: أرقام لاتينية موحّدة بفواصل آلاف ومنازل عشرية
 */

/**
 * تنسيق الأرقام المالية — لاتيني موحّد
 * @example fmt(16666.67) → "16,666.67"
 */
export const fmt = (n: number | null | undefined, decimals = 2): string => {
  const safe = typeof n === 'number' && !isNaN(n) ? n : 0;
  return safe.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * تنسيق الأرقام بدون كسور (للأعداد الصحيحة مثل عدد العقارات)
 * @example fmtInt(1666) → "1,666"
 */
export const fmtInt = (n: number | null | undefined): string => fmt(n, 0);

/**
 * تنسيق مع رمز العملة
 * @example fmtSAR(16666.67) → "16,666.67 ر.س"
 */
export const fmtSAR = (n: number | null | undefined, decimals = 2): string =>
  `${fmt(n, decimals)} ر.س`;

/**
 * تنسيق النسبة المئوية
 * @example fmtPct(16.666) → "16.67%"
 */
export const fmtPct = (n: number | null | undefined, decimals = 2): string =>
  `${fmt(n, decimals)}%`;

/** للتوافق مع الكود القديم — سيُزال تدريجياً */
export const fmtAr = fmt;
