/**
 * أساس توزيع حصص المستفيدين.
 * إن أدخل الناظر مبلغاً مقرراً يُوزَّع هو (دون تجاوز المتاح)، وإلا يُوزَّع المتاح كاملاً.
 */
export interface DistributionBase {
  base: number;
  available: number;
  decided: number;
  remaining: number;
  exceeds: boolean;
  usesDecided: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeDistributionBase(available: number, decided: number): DistributionBase {
  const a = Math.max(0, Number(available) || 0);
  const d = Math.max(0, Number(decided) || 0);
  const usesDecided = d > 0;
  const base = usesDecided ? Math.min(d, a) : a;
  return {
    base: round2(base),
    available: round2(a),
    decided: round2(d),
    remaining: round2(Math.max(0, a - base)),
    exceeds: usesDecided && d > a,
    usesDecided,
  };
}

/** تحذير مجموع النسب فقط إذا ابتعد عن 100% بأكثر من 0.01% (تجاهل فروق التقريب). */
export function isPercentageTotalOff(total: number): boolean {
  return total > 0 && Math.abs(total - 100) > 0.01;
}

/** حصة مستفيد تناسبية من الأساس. */
export function shareOf(base: number, pct: number, totalPct: number): number {
  return totalPct > 0 ? (base * Number(pct)) / totalPct : 0;
}
