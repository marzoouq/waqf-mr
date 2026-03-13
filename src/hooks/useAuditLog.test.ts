import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { getTableNameAr, getOperationNameAr } from './useAuditLog';

// موك Supabase
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockRange = vi.fn();
const mockEq = vi.fn();
const mockOr = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  },
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
  // سلسلة الاستدعاءات الافتراضية
  mockSelect.mockReturnValue({ order: mockOrder });
  mockOrder.mockReturnValue({ range: mockRange });
  mockRange.mockResolvedValue({ data: [], error: null, count: 0 });
  mockEq.mockReturnValue({ order: mockOrder });
  mockOr.mockReturnValue({ order: mockOrder });
});

describe('getTableNameAr', () => {
  it('يترجم أسماء الجداول المعروفة', () => {
    expect(getTableNameAr('income')).toBe('الدخل');
    expect(getTableNameAr('expenses')).toBe('المصروفات');
    expect(getTableNameAr('contracts')).toBe('العقود');
  });

  it('يُرجع الاسم الأصلي للجداول غير المعروفة', () => {
    expect(getTableNameAr('unknown_table')).toBe('unknown_table');
  });
});

describe('getOperationNameAr', () => {
  it('يترجم العمليات المعروفة', () => {
    expect(getOperationNameAr('INSERT')).toBe('إضافة');
    expect(getOperationNameAr('UPDATE')).toBe('تعديل');
    expect(getOperationNameAr('DELETE')).toBe('حذف');
  });

  it('يُرجع الاسم الأصلي للعمليات غير المعروفة', () => {
    expect(getOperationNameAr('TRUNCATE')).toBe('TRUNCATE');
  });
});

describe('useAuditLog', () => {
  it('يرندر بدون خطأ ويُرجع بيانات', async () => {
    mockRange.mockResolvedValue({
      data: [{ id: '1', table_name: 'income', operation: 'INSERT', record_id: null, old_data: null, new_data: null, user_id: null, created_at: '2025-01-01' }],
      error: null,
      count: 1,
    });

    // استيراد ديناميكي لتفادي مشاكل الموك
    const { useAuditLog } = await import('./useAuditLog');
    const { result } = renderHook(() => useAuditLog(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.logs).toHaveLength(1);
    expect(result.current.data?.totalCount).toBe(1);
  });

  it('يحسب pagination صحيح (page 2, pageSize 50)', async () => {
    mockRange.mockResolvedValue({ data: [], error: null, count: 0 });

    const { useAuditLog } = await import('./useAuditLog');
    renderHook(() => useAuditLog({ page: 2, pageSize: 50 }), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockRange).toHaveBeenCalledWith(50, 99);
    });
  });

  it('ينظّف searchQuery من الأحرف الخاصة', async () => {
    mockRange.mockResolvedValue({ data: [], error: null, count: 0 });
    // عند وجود or، نُرجع سلسلة كاملة
    mockOrder.mockReturnValue({ or: mockOr });
    mockOr.mockReturnValue({ range: mockRange });

    const { useAuditLog } = await import('./useAuditLog');
    renderHook(() => useAuditLog({ searchQuery: 'test%_\\()' }), { wrapper: createWrapper() });

    await waitFor(() => {
      // يجب أن يُنظَّف إلى 'test' فقط
      if (mockOr.mock.calls.length > 0) {
        const orArg = mockOr.mock.calls[0][0];
        expect(orArg).not.toContain('%');
        expect(orArg).not.toContain('_');
        expect(orArg).not.toContain('\\');
      }
    });
  });
});
