/**
 * اختبارات useExpensesPage — الفلترة والتحقق والحساب
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// --- Mocks ---
const mockExpenses = [
  { id: 'e1', expense_type: 'صيانة', amount: 5000, date: '2025-03-01', property_id: 'p1', description: 'إصلاح مكيفات', fiscal_year_id: 'fy1', created_at: '2025-03-01' },
  { id: 'e2', expense_type: 'كهرباء', amount: 1500, date: '2025-04-01', property_id: 'p2', description: null, fiscal_year_id: 'fy1', created_at: '2025-04-01' },
  { id: 'e3', expense_type: 'صيانة', amount: 3000, date: '2025-05-15', property_id: 'p1', description: 'سباكة', fiscal_year_id: 'fy1', created_at: '2025-05-15' },
];

const mockInvoices = [
  { id: 'inv1', expense_id: 'e1', invoice_type: 'expense', status: 'paid' },
];

vi.mock('@/hooks/data/financial/useExpenses', () => ({
  useExpensesByFiscalYear: () => ({ data: mockExpenses, isLoading: false }),
  useCreateExpense: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateExpense: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteExpense: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/hooks/data/invoices/useInvoices', () => ({
  useInvoicesByFiscalYear: () => ({ data: mockInvoices }),
}));

vi.mock('@/hooks/data/properties/useProperties', () => ({
  useProperties: () => ({ data: [{ id: 'p1', property_number: 'W-01' }, { id: 'p2', property_number: 'W-02' }] }),
}));

vi.mock('@/contexts/FiscalYearContext', () => ({
  useFiscalYear: () => ({ fiscalYearId: 'fy1', fiscalYear: { id: 'fy1', label: '1446', status: 'active' }, isClosed: false }),
}));

vi.mock('@/hooks/auth/useAuthContext', () => ({
  useAuth: () => ({ role: 'admin' }),
}));

vi.mock('@/hooks/data/settings/usePdfWaqfInfo', () => ({
  usePdfWaqfInfo: () => ({ waqfName: 'وقف الثبيتي' }),
}));

vi.mock('@/lib/notify', () => ({
  defaultNotify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/hooks/ui/useTableSort', () => ({
  useTableSort: () => ({ sortField: null, sortDir: 'asc', handleSort: vi.fn() }),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useExpensesPage', () => {
  beforeEach(() => vi.clearAllMocks());

  // استيراد ديناميكي لتجنب مشاكل ترتيب الـ mocks
  const loadHook = async () => {
    const mod = await import('./useExpensesPage');
    return mod.useExpensesPage;
  };

  it('يحسب إجمالي المصروفات بشكل صحيح', async () => {
    const useExpensesPage = await loadHook();
    const { result } = renderHook(() => useExpensesPage(), { wrapper: createWrapper() });
    // 5000 + 1500 + 3000 = 9500
    expect(result.current.totalExpenses).toBe(9500);
  });

  it('يستخرج الأنواع الفريدة', async () => {
    const useExpensesPage = await loadHook();
    const { result } = renderHook(() => useExpensesPage(), { wrapper: createWrapper() });
    expect(result.current.uniqueTypes).toContain('صيانة');
    expect(result.current.uniqueTypes).toContain('كهرباء');
    expect(result.current.uniqueTypes).toHaveLength(2);
  });

  it('يحسب نسبة التوثيق بشكل صحيح', async () => {
    const useExpensesPage = await loadHook();
    const { result } = renderHook(() => useExpensesPage(), { wrapper: createWrapper() });
    // 1 فاتورة مرتبطة من أصل 3 مصروفات = 33%
    expect(result.current.documentedCount).toBe(1);
    expect(result.current.documentationRate).toBe(33);
  });

  it('يصفّي حسب النص', async () => {
    const useExpensesPage = await loadHook();
    const { result } = renderHook(() => useExpensesPage(), { wrapper: createWrapper() });
    act(() => result.current.setSearchQuery('مكيفات'));
    expect(result.current.filteredExpenses).toHaveLength(1);
    expect(result.current.filteredExpenses[0]!.id).toBe('e1');
  });

  it('يعرض كل المصروفات بدون فلتر', async () => {
    const useExpensesPage = await loadHook();
    const { result } = renderHook(() => useExpensesPage(), { wrapper: createWrapper() });
    expect(result.current.filteredExpenses).toHaveLength(3);
  });

  it('canAdd يكون true عندما السنة مفتوحة والدور admin', async () => {
    const useExpensesPage = await loadHook();
    const { result } = renderHook(() => useExpensesPage(), { wrapper: createWrapper() });
    expect(result.current.canAdd).toBe(true);
  });
});
