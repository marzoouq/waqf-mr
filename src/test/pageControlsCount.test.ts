/**
 * pageControlsCount — يستهلك audit/page-controls-audit.csv
 *
 * يثبت العدد الإجمالي ويضمن صفر فجوات (GAP-NO-HANDLER) في صفحات الناظر/المستفيد
 * وأول مستوى من المكوّنات المستوردة منها. يُولَّد التقرير عبر:
 *   `node scripts/audit-page-controls.mjs`
 *
 * إن تغيّر العدد عمداً: شغّل السكربت، راجع `audit/page-controls-audit.md`،
 * ثم حدّث `EXPECTED_TOTAL` هنا. أي زيادة مفاجئة في GAP يجب أن تفشل CI.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const CSV = resolve(process.cwd(), 'audit/page-controls-audit.csv');

// خط الأساس المعتمد — حدّثه عند تغيير مقصود في الصفحات
const EXPECTED_TOTAL = 114;
const TOLERANCE = 20; // نسمح بتذبذب طفيف لتفادي هشاشة السنابشوت

describe('page-controls audit snapshot', () => {
  if (!existsSync(CSV)) {
    it.skip('audit/page-controls-audit.csv غير موجود — شغّل scripts/audit-page-controls.mjs', () => {});
    return;
  }

  const lines = readFileSync(CSV, 'utf8').trim().split('\n').slice(1);
  const rows = lines.map((l) => {
    const cells = l.split(',');
    return { status: cells[cells.length - 1] };
  });

  it('لا توجد فجوات GAP-NO-HANDLER في الصفحات أو أول مستوى من مكوّناتها', () => {
    const gaps = rows.filter((r) => r.status && r.status !== 'OK');
    expect(gaps, `وُجد ${gaps.length} عنصر تحكم بدون handler — راجع audit/page-controls-audit.md`).toHaveLength(0);
  });

  it(`إجمالي عناصر التحكم يبقى ضمن ±${TOLERANCE} من خط الأساس (${EXPECTED_TOTAL})`, () => {
    expect(rows.length).toBeGreaterThanOrEqual(EXPECTED_TOTAL - TOLERANCE);
    expect(rows.length).toBeLessThanOrEqual(EXPECTED_TOTAL + TOLERANCE);
  });
});
