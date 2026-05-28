/**
 * اختبار تكامل: عمليات CRUD على income/expenses تعكس تغييرات قاعدة البيانات في الواجهة.
 *
 * يستخدم mock لـ supabase client يحاكي جدولاً في الذاكرة، ثم يتحقق أن
 * invalidateQueries داخل CRUD factory يؤدي إلى refetch يعكس الحالة الجديدة.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createElement } from 'react';

// ─── Mock DB ─────────────────────────────────────────────────────────────────
type Row = Record<string, unknown> & { id: string; fiscal_year_id?: string };
const mockDb: Record<string, Row[]> = {
  income: [],
  expenses: [],
};

let nextId = 1;
const genId = () => `mock-${nextId++}`;

// ─── Mock Supabase builder ───────────────────────────────────────────────────
function buildQuery(table: string) {
  const state: {
    op: 'select' | 'insert' | 'update' | 'delete';
    payload?: Row | Partial<Row>;
    filters: Array<[string, unknown]>;
  } = { op: 'select', filters: [] };

  const exec = () => {
    let rows = mockDb[table] ?? [];
    if (state.op === 'select' || state.op === 'delete' || state.op === 'update') {
      rows = rows.filter((r) =>
        state.filters.every(([col, val]) => (r as Record<string, unknown>)[col] === val),
      );
    }

    if (state.op === 'insert') {
      const payload = state.payload as Row;
      const inserted = { ...payload, id: payload.id ?? genId() };
      (mockDb[table] ??= []).push(inserted);
      return { data: inserted, error: null };
    }

    if (state.op === 'update') {
      const updates = state.payload as Partial<Row>;
      const updated = rows.map((r) => Object.assign(r, updates));
      const t = mockDb[table];
      if (t) {
        rows.forEach((r) => {
          const idx = t.indexOf(r);
          if (idx !== -1) t[idx] = r;
        });
      }
      void updated;
      return { data: updated[0] ?? null, error: null };
    }

    if (state.op === 'delete') {
      mockDb[table] = (mockDb[table] ?? []).filter((r) => !rows.includes(r));
      return { data: null, error: null };
    }

    // select
    return { data: rows, error: null };
  };

  const builder: Record<string, unknown> = {};
  const chainable = () => builder;

  builder.select = vi.fn(() => { state.op = state.op === 'select' ? 'select' : state.op; return builder; });
  builder.insert = vi.fn((payload: Row) => { state.op = 'insert'; state.payload = payload; return builder; });
  builder.update = vi.fn((payload: Partial<Row>) => { state.op = 'update'; state.payload = payload; return builder; });
  builder.delete = vi.fn(() => { state.op = 'delete'; return builder; });
  builder.order = vi.fn(chainable);
  builder.limit = vi.fn(chainable);
  builder.eq = vi.fn((col: string, val: unknown) => { state.filters.push([col, val]); return builder; });

  builder.maybeSingle = vi.fn(() => Promise.resolve(exec()));
  builder.single = vi.fn(() => Promise.resolve(exec()));
  // For terminal awaits (select chains end with await on builder)
  (builder as { then?: unknown }).then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(exec()).then(onFulfilled);

  return builder;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => buildQuery(table)),
  },
}));

// ─── Silence side-effects ────────────────────────────────────────────────────
vi.mock('@/lib/notify', () => ({
  uiNotify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  crudNotifyAdapter: () => ({ success: vi.fn(), error: vi.fn() }),
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/utils/notifications', () => ({
  notifyAllBeneficiaries: vi.fn(),
}));

// ─── Imports under test ──────────────────────────────────────────────────────
import {
  useIncomeByFiscalYear,
  useCreateIncome,
  useUpdateIncome,
  useDeleteIncome,
} from '@/hooks/data/financial/income/useIncome';
import {
  useExpensesByFiscalYear,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
} from '@/hooks/data/financial/expenses/useExpenses';

// ─── Wrapper ─────────────────────────────────────────────────────────────────
const makeWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
};

const FY = 'fy-test-1';

beforeEach(() => {
  mockDb.income = [
    { id: 'i1', source: 'إيجار', amount: 1000, date: '2024-06-01', fiscal_year_id: FY },
    { id: 'i2', source: 'تبرع', amount: 500, date: '2024-07-01', fiscal_year_id: FY },
  ];
  mockDb.expenses = [
    { id: 'e1', expense_type: 'كهرباء', amount: 200, date: '2024-06-01', fiscal_year_id: FY },
    { id: 'e2', expense_type: 'صيانة', amount: 300, date: '2024-07-01', fiscal_year_id: FY },
  ];
  nextId = 100;
});

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('Income CRUD reflects DB changes in UI', () => {
  it('list → create → update → delete', async () => {
    const sharedWrapper = makeWrapper();

    const hooks = renderHook(
      () => ({
        list: useIncomeByFiscalYear(FY),
        create: useCreateIncome(),
        update: useUpdateIncome(),
        del: useDeleteIncome(),
      }),
      { wrapper: sharedWrapper },
    );

    await waitFor(() => expect(hooks.result.current.list.data?.length).toBe(2));

    await act(async () => {
      await hooks.result.current.create.mutateAsync({
        source: 'إضافة جديدة',
        amount: 2000,
        date: '2024-08-01',
        fiscal_year_id: FY,
      } as never);
    });

    await waitFor(() => expect(hooks.result.current.list.data?.length).toBe(3));
    expect(hooks.result.current.list.data?.some((r) => r.source === 'إضافة جديدة')).toBe(true);

    // UPDATE
    await act(async () => {
      await hooks.result.current.update.mutateAsync({ id: 'i1', amount: 9999 } as never);
    });
    await waitFor(() => {
      const row = hooks.result.current.list.data?.find((r) => r.id === 'i1');
      expect(row?.amount).toBe(9999);
    });

    // DELETE
    await act(async () => {
      await hooks.result.current.del.mutateAsync('i2');
    });
    await waitFor(() => {
      expect(hooks.result.current.list.data?.some((r) => r.id === 'i2')).toBe(false);
      expect(hooks.result.current.list.data?.length).toBe(2);
    });

  });
});


describe('Expenses CRUD reflects DB changes in UI', () => {
  it('list → create → update → delete', async () => {
    const wrapper = makeWrapper();
    const hooks = renderHook(
      () => ({
        list: useExpensesByFiscalYear(FY),
        create: useCreateExpense(),
        update: useUpdateExpense(),
        del: useDeleteExpense(),
      }),
      { wrapper },
    );

    await waitFor(() => expect(hooks.result.current.list.data?.length).toBe(2));

    await act(async () => {
      await hooks.result.current.create.mutateAsync({
        expense_type: 'مياه',
        amount: 150,
        date: '2024-08-15',
        fiscal_year_id: FY,
      } as never);
    });
    await waitFor(() => expect(hooks.result.current.list.data?.length).toBe(3));
    expect(hooks.result.current.list.data?.some((r) => r.expense_type === 'مياه')).toBe(true);

    await act(async () => {
      await hooks.result.current.update.mutateAsync({ id: 'e1', amount: 7777 } as never);
    });
    await waitFor(() => {
      const row = hooks.result.current.list.data?.find((r) => r.id === 'e1');
      expect(row?.amount).toBe(7777);
    });

    await act(async () => {
      await hooks.result.current.del.mutateAsync('e2');
    });
    await waitFor(() => {
      expect(hooks.result.current.list.data?.some((r) => r.id === 'e2')).toBe(false);
      expect(hooks.result.current.list.data?.length).toBe(2);
    });
  });
});
