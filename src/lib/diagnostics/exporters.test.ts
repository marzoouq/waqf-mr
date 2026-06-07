import { describe, it, expect } from 'vitest';
import { computeSummary, toJsonReport, toTextReport, collectFailedIds } from './exporters';
import type { CategoryResults } from './exporters';

const sample: CategoryResults[] = [
  {
    category: 'قاعدة البيانات',
    results: [
      { id: 'db_connection', label: 'اتصال', status: 'pass', detail: '120ms' },
      { id: 'db_realtime', label: 'realtime', status: 'warn', detail: 'بطء' },
    ],
  },
  {
    category: 'الأمان',
    results: [
      { id: 'auth_session', label: 'جلسة', status: 'fail', detail: 'منتهية' },
    ],
  },
];

describe('exporters', () => {
  it('computeSummary counts by status and computes health score', () => {
    const s = computeSummary(sample);
    expect(s).toEqual({ total: 3, pass: 1, warn: 1, fail: 1, info: 0, healthScore: 33 });
  });

  it('toJsonReport enriches with meta and includes summary', () => {
    const r = toJsonReport(sample);
    expect(r.schemaVersion).toBe(1);
    expect(r.summary.total).toBe(3);
    const firstResult = r.categories[0]?.results[0];
    expect(firstResult?.sourceFile).toContain('database.ts');
    expect(firstResult?.docLink).toContain('check-catalog.md');
  });

  it('toTextReport includes header and lines', () => {
    const t = toTextReport(sample);
    expect(t).toContain('تقرير تشخيص النظام');
    expect(t).toContain('[PASS]');
    expect(t).toContain('[FAIL]');
  });

  it('collectFailedIds returns ids only', () => {
    expect(collectFailedIds(sample)).toEqual(['auth_session']);
    expect(collectFailedIds(sample, true)).toEqual(['db_realtime', 'auth_session']);
  });
});
