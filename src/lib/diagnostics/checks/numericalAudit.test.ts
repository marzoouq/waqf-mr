/**
 * اختبارات بطاقة 10 — التدقيق الرقمي DB ↔ RPC ↔ UI
 *
 * نُحاكي supabase client لتمرير ثلاث حالات:
 *   1) matched — DB = RPC ⇒ status='pass'
 *   2) drift — DB ≠ RPC ⇒ status='fail' مع تفاصيل الفرق
 *   3) snapshot drift — warn فقط (لا fail) للسنوات المقفلة
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

type RpcResult = { data: unknown; error: { message: string } | null };
type TableResult = { data: unknown; error: { message: string } | null };

const state: {
  fy: { active: unknown; closed: unknown };
  income: TableResult;
  expenses: TableResult;
  accounts: TableResult;
  rpc: RpcResult;
} = {
  fy: { active: null, closed: null },
  income: { data: [], error: null },
  expenses: { data: [], error: null },
  accounts: { data: null, error: null },
  rpc: { data: null, error: null },
};

vi.mock('@/integrations/supabase/client', () => {
  const makeBuilder = (rows: TableResult) => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      gt: () => builder,
      in: () => builder,
      order: () => builder,
      limit: () => builder,
      maybeSingle: async () => rows,
      then: (resolve: (v: TableResult) => unknown) => resolve(rows),
    };
    return builder;
  };

  return {
    supabase: {
      from: (table: string) => {
        if (table === 'fiscal_years') {
          // أول استدعاء (active) ثم closed — نستخدم counter
          let firstCall = true;
          const dynamicBuilder: Record<string, unknown> = {
            select: () => dynamicBuilder,
            eq: (_col: string, value: string) => {
              const rows = value === 'active'
                ? { data: state.fy.active, error: null }
                : { data: state.fy.closed, error: null };
              return makeBuilder(rows);
            },
            order: () => dynamicBuilder,
            limit: () => dynamicBuilder,
            maybeSingle: async () => ({ data: firstCall ? state.fy.active : state.fy.closed, error: null }),
            then: (resolve: (v: TableResult) => unknown) => {
              const out = firstCall ? state.fy.active : state.fy.closed;
              firstCall = false;
              return resolve({ data: out, error: null });
            },
          };
          return dynamicBuilder;
        }
        if (table === 'income') return makeBuilder(state.income);
        if (table === 'expenses') return makeBuilder(state.expenses);
        if (table === 'accounts') return makeBuilder(state.accounts);
        return makeBuilder({ data: [], error: null });
      },
      rpc: vi.fn(async () => state.rpc),
    },
  };
});

import {
  checkDbVsRpcTotalIncome,
  checkDbVsRpcExpenses,
  checkRpcVsUiAvailableAmount,
  checkSnapshotIntegrityClosedYear,
} from './numericalAudit';

beforeEach(() => {
  state.fy.active = { id: 'fy-1', label: '2024-2025', status: 'active' };
  state.fy.closed = { id: 'fy-0', label: '2023-2024', status: 'closed' };
  state.income = { data: [], error: null };
  state.expenses = { data: [], error: null };
  state.accounts = { data: null, error: null };
  state.rpc = { data: null, error: null };
});

describe('numericalAudit — checkDbVsRpcTotalIncome', () => {
  it('returns pass when DB matches RPC', async () => {
    state.income = { data: [{ amount: 100 }, { amount: 50 }], error: null };
    state.rpc = { data: { totals: { total_income: 150 } }, error: null };
    const r = await checkDbVsRpcTotalIncome();
    expect(r.status).toBe('pass');
    expect(r.detail).toContain('2024-2025');
  });

  it('returns fail with drift detail when DB ≠ RPC', async () => {
    state.income = { data: [{ amount: 100 }], error: null };
    state.rpc = { data: { totals: { total_income: 200 } }, error: null };
    const r = await checkDbVsRpcTotalIncome();
    expect(r.status).toBe('fail');
    expect(r.detail).toContain('Δ=100');
  });

  it('returns info when no fiscal year exists', async () => {
    state.fy.active = null;
    state.fy.closed = null;
    const r = await checkDbVsRpcTotalIncome();
    expect(r.status).toBe('info');
  });
});

describe('numericalAudit — checkDbVsRpcExpenses', () => {
  it('returns pass when expenses match', async () => {
    state.expenses = { data: [{ amount: 75 }, { amount: 25 }], error: null };
    state.rpc = { data: { totals: { total_expenses: 100 } }, error: null };
    const r = await checkDbVsRpcExpenses();
    expect(r.status).toBe('pass');
  });

  it('returns fail when expenses drift', async () => {
    state.expenses = { data: [{ amount: 100 }], error: null };
    state.rpc = { data: { totals: { total_expenses: 150 } }, error: null };
    const r = await checkDbVsRpcExpenses();
    expect(r.status).toBe('fail');
    expect(r.detail).toContain('Δ=50');
  });
});

describe('numericalAudit — checkRpcVsUiAvailableAmount', () => {
  it('returns pass when RPC available matches max(0, waqf_revenue - corpus)', async () => {
    state.rpc = {
      data: { totals: { waqf_revenue: 1000, waqf_corpus_manual: 200, available_amount: 800 } },
      error: null,
    };
    const r = await checkRpcVsUiAvailableAmount();
    expect(r.status).toBe('pass');
  });

  it('returns fail when RPC drifts from UI formula', async () => {
    state.rpc = {
      data: { totals: { waqf_revenue: 1000, waqf_corpus_manual: 200, available_amount: 999 } },
      error: null,
    };
    const r = await checkRpcVsUiAvailableAmount();
    expect(r.status).toBe('fail');
  });

  it('clamps to zero — corpus > revenue ⇒ UI=0', async () => {
    state.rpc = {
      data: { totals: { waqf_revenue: 100, waqf_corpus_manual: 500, available_amount: 0 } },
      error: null,
    };
    const r = await checkRpcVsUiAvailableAmount();
    expect(r.status).toBe('pass');
  });
});

describe('numericalAudit — checkSnapshotIntegrityClosedYear', () => {
  it('returns pass when snapshot matches live income', async () => {
    state.accounts = { data: { total_income: 500, total_expenses: 0, waqf_revenue: 0, waqf_corpus_manual: 0 }, error: null };
    state.income = { data: [{ amount: 500 }], error: null };
    const r = await checkSnapshotIntegrityClosedYear();
    expect(r.status).toBe('pass');
  });

  it('returns warn (not fail) when snapshot drifts — closed-year drifts are tolerated', async () => {
    state.accounts = { data: { total_income: 500, total_expenses: 0, waqf_revenue: 0, waqf_corpus_manual: 0 }, error: null };
    state.income = { data: [{ amount: 600 }], error: null };
    const r = await checkSnapshotIntegrityClosedYear();
    expect(r.status).toBe('warn');
    expect(r.detail).toContain('قد يكون متوقعاً');
  });

  it('returns info when no closed year exists', async () => {
    state.fy.closed = null;
    const r = await checkSnapshotIntegrityClosedYear();
    expect(r.status).toBe('info');
  });
});
