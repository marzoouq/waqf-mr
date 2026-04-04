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

/**
 * تنسيق التاريخ — صيغة موحّدة YYYY/MM/DD
 * @example fmtDate("2025-01-15") → "2025/01/15"
 */
export const fmtDate = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-CA').replace(/-/g, '/');
};

/**
 * تنسيق التاريخ بالهجري
 * @example fmtDateHijri("2025-01-15") → "١٥/٠٧/١٤٤٦"
 */
export const fmtDateHijri = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ar-SA-u-ca-islamic', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

