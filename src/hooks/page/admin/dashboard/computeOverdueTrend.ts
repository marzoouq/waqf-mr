/**
 * حساب اتجاه آخر 6 أشهر للمبالغ المتأخرة — مستخرج لتقليل حجم هوك المحاسب.
 */
import type { HeatmapInvoice } from '@/hooks/data/financial/dashboard/useDashboardSummary';

export function computeOverdueTrend(heatmapInvoices: HeatmapInvoice[], today: string): number[] {
  if (!heatmapInvoices.length) return [];
  const map = new Map<string, number>();
  for (const inv of heatmapInvoices) {
    const isPastDue = inv.due_date < today;
    const isOverdue = inv.status === 'overdue'
      || (isPastDue && (inv.status === 'pending' || inv.status === 'partially_paid'));
    if (!isOverdue) continue;
    const m = inv.due_date.slice(0, 7);
    const remaining = inv.status === 'partially_paid'
      ? Math.max(0, inv.amount - (inv.paid_amount ?? 0))
      : inv.amount;
    map.set(m, (map.get(m) ?? 0) + remaining);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([, v]) => v);
}
