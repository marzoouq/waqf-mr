import { describe, it, expect } from 'vitest';
import { buildVarianceReport, summarizeVariance } from './varianceReport';

describe('varianceReport', () => {
  it('reports ok when values match within tolerance', () => {
    const rows = buildVarianceReport([
      {
        card: 'AdminDashboard',
        fyLabel: '2024-2025',
        fields: {
          total_income: { rpc: 100_000, ui: 100_000 },
          available_amount: { rpc: 50_000.005, ui: 50_000 },
        },
      },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.status === 'ok')).toBe(true);
  });

  it('detects drift beyond 0.01 SAR', () => {
    const rows = buildVarianceReport([
      {
        card: 'BeneficiaryShare',
        fyLabel: '2023-2024',
        fields: {
          my_share: { rpc: 12_500, ui: 12_499, suspectedSource: 'useMyShare' },
        },
      },
    ]);
    const r0 = rows[0]!;
    expect(r0.status).toBe('drift');
    expect(r0.diff).toBeCloseTo(1, 5);
    expect(r0.suspectedSource).toBe('useMyShare');
  });

  it('marks missing values without computing diff', () => {
    const rows = buildVarianceReport([
      { card: 'X', fyLabel: '—', fields: { v: { rpc: 10, ui: null } } },
      { card: 'X', fyLabel: '—', fields: { v: { rpc: undefined, ui: 5 } } },
    ]);
    expect(rows[0]!.status).toBe('missing');
    expect(rows[1]!.status).toBe('missing');
  });

  it('summarizes correctly', () => {
    const rows = buildVarianceReport([
      {
        card: 'C',
        fyLabel: 'FY',
        fields: {
          a: { rpc: 1, ui: 1 },
          b: { rpc: 2, ui: 3 },
          c: { rpc: null, ui: 1 },
        },
      },
    ]);
    expect(summarizeVariance(rows)).toEqual({ total: 3, ok: 1, drift: 1, missing: 1 });
  });
});
