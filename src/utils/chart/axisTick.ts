/**
 * Compact Arabic axis tick for money charts (e.g. 450000 → "450 ألف", 1800000 → "1.8 مليون").
 * بديل موحّد لاختصار "k" الإنجليزي في محاور الرسوم.
 */
export function formatAxisTick(value: number): string {
  const abs = Math.abs(value);
  const trim = (n: number) => String(Number(n.toFixed(1)));
  if (abs >= 1_000_000) return `${trim(value / 1_000_000)} مليون`;
  if (abs >= 1_000) return `${trim(value / 1_000)} ألف`;
  return String(value);
}

/** عرض محور Y المناسب للتسميات العربية */
export const AXIS_TICK_WIDTH = 64;
