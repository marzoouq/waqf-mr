/**
 * تحويل آمن لأي قيمة إلى رقم — يمنع أخطاء NaN الصامتة في الحسابات المالية.
 * يُعيد 0 لأي قيمة `null` أو `undefined` أو غير رقمية.
 */
export const safeNumber = (value: unknown): number => {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * تحويل آمن لنسبة مئوية مع قيمة افتراضية.
 * يُستخدم لنسب الناظر والواقف من الإعدادات.
 */
export const safePercent = (value: unknown, fallback: number): number => {
  if (value == null || value === '') return fallback;
  const n = parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
};
