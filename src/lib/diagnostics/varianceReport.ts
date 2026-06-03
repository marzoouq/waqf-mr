/**
 * varianceReport — مقارنة قيم RPC مع قيم الواجهة لكل بطاقة لوحة قيادة
 *
 * أداة تشخيص نقية (بدون استدعاءات شبكة) تأخذ القيم المُجمَّعة من
 * `get_dashboard_full_summary` وتقارنها مع القيم التي تحسبها الهوكس/المكونات،
 * وتُعيد قائمة الانحرافات (> 0.01 SAR).
 *
 * تُستخدم في:
 *   - اختبارات الانحدار (regression) لضمان عدم تخالف الأرقام بعد Stage 3
 *   - صفحة تشخيص الناظر (admin/diagnostics) لاستعراض النتائج وقت التشغيل
 */
export type VarianceStatus = 'ok' | 'drift' | 'missing';

export interface VarianceRow {
  card: string;
  field: string;
  rpc: number | null;
  ui: number | null;
  diff: number;
  fyLabel: string;
  status: VarianceStatus;
  suspectedSource?: string;
}

export interface VarianceInput {
  card: string;
  fyLabel: string;
  fields: Record<string, { rpc: number | null | undefined; ui: number | null | undefined; suspectedSource?: string }>;
}

const TOLERANCE = 0.01;

const toNum = (v: number | null | undefined): number | null =>
  v === null || v === undefined || Number.isNaN(v) ? null : Number(v);

export function buildVarianceReport(inputs: readonly VarianceInput[]): VarianceRow[] {
  const rows: VarianceRow[] = [];
  for (const input of inputs) {
    for (const [field, vals] of Object.entries(input.fields)) {
      const rpc = toNum(vals.rpc);
      const ui = toNum(vals.ui);
      if (rpc === null || ui === null) {
        rows.push({
          card: input.card,
          field,
          rpc,
          ui,
          diff: 0,
          fyLabel: input.fyLabel,
          status: 'missing',
          suspectedSource: vals.suspectedSource,
        });
        continue;
      }
      const diff = Math.abs(rpc - ui);
      rows.push({
        card: input.card,
        field,
        rpc,
        ui,
        diff,
        fyLabel: input.fyLabel,
        status: diff > TOLERANCE ? 'drift' : 'ok',
        suspectedSource: diff > TOLERANCE ? vals.suspectedSource : undefined,
      });
    }
  }
  return rows;
}

export const summarizeVariance = (rows: readonly VarianceRow[]) => ({
  total: rows.length,
  ok: rows.filter((r) => r.status === 'ok').length,
  drift: rows.filter((r) => r.status === 'drift').length,
  missing: rows.filter((r) => r.status === 'missing').length,
});

export const VARIANCE_TOLERANCE = TOLERANCE;
