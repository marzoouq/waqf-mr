/**
 * Visual bar geometry for the revenue path ("مسار الريع") — pure, presentation only.
 * لا يُنتج أي رقم معروض: الأرقام المعروضة تأتي كما هي من الخادم، وهذه الدالة تحسب
 * فقط موضع وعرض الشريط (نسبة مئوية من اليمين) ليقرأ المستخدم التسلسل بصرياً.
 */
import type { WaterfallRow } from '@/types';

export interface WaterfallBar {
  /** offset from the right edge, 0..100 */
  start: number;
  /** width, 0..100 */
  width: number;
}

const clamp = (n: number) => Math.min(100, Math.max(0, n));

export function buildWaterfallBars(rows: readonly WaterfallRow[], base: number): WaterfallBar[] {
  if (!(base > 0)) return rows.map(() => ({ start: 0, width: 0 }));
  let level = 0;
  return rows.map((row) => {
    const pct = (Math.abs(row.value) / base) * 100;
    if (row.kind === 'plus') {
      const bar = { start: clamp(level), width: clamp(pct) };
      level += pct;
      return bar;
    }
    if (row.kind === 'minus' || row.kind === 'vat' || row.kind === 'share') {
      level -= pct;
      return { start: clamp(level), width: clamp(pct) };
    }
    // subtotal / total / mine: الشريط يمثّل القيمة كما وصلت من الخادم
    level = pct;
    return { start: 0, width: clamp(pct) };
  });
}
