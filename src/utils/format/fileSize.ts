/**
 * تنسيق حجم الملف من بايت إلى نص قابل للقراءة بالعربية.
 *
 * @example
 *   formatBytes(0)        // "0 بايت"
 *   formatBytes(1500)     // "1.46 ك.ب"
 *   formatBytes(1048576)  // "1 م.ب"
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 بايت';
  const k = 1024;
  const units = ['بايت', 'ك.ب', 'م.ب', 'ج.ب'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  const value = bytes / Math.pow(k, i);
  const formatted = i === 0 ? String(Math.round(value)) : value.toFixed(decimals).replace(/\.?0+$/, '');
  return `${formatted} ${units[i]}`;
}
