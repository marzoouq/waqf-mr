/**
 * Mock factory لـ supabase client — تستخدمه اختبارات E2E التي تحتاج طبقة بيانات
 * (vs. mocking page hooks مباشرة).
 *
 * ملاحظة: معظم اختبارات E2E هنا تموك hook الصفحة مباشرة لأنه أبسط وأسرع.
 * هذا الـmock متاح للحالات التي تحتاج enf-to-end fully integrated.
 */
import { vi } from 'vitest';

type QueryRow = { data: unknown; error: { message: string } | null };

export interface SupabaseMockState {
  tables: Record<string, QueryRow>;
  rpcs: Record<string, QueryRow>;
}

export function createSupabaseMockState(): SupabaseMockState {
  return { tables: {}, rpcs: {} };
}

export function buildMockSupabase(state: SupabaseMockState) {
  const makeBuilder = (rows: QueryRow) => {
    const b: Record<string, unknown> = {
      select: () => b,
      eq: () => b,
      in: () => b,
      gt: () => b,
      order: () => b,
      limit: () => b,
      maybeSingle: async () => rows,
      single: async () => rows,
      then: (resolve: (v: QueryRow) => unknown) => resolve(rows),
    };
    return b;
  };

  return {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
      signOut: vi.fn(async () => ({ error: null })),
    },
    from: (table: string) => makeBuilder(state.tables[table] ?? { data: [], error: null }),
    rpc: vi.fn(async (name: string) => state.rpcs[name] ?? { data: null, error: null }),
    channel: vi.fn(() => ({
      on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
      subscribe: () => ({ unsubscribe: () => {} }),
      unsubscribe: () => {},
    })),
    removeChannel: vi.fn(),
    functions: { invoke: vi.fn(async () => ({ data: null, error: null })) },
  };
}
