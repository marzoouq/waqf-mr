/**
 * اختبارات useBeneficiariesPage — إدارة المستفيدين
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// --- Mocks ---
const mockBeneficiaries = [
  { id: 'b1', name: 'محمد', share_percentage: 30, phone: '0501234567', email: 'a@b.com', bank_account: null, notes: null, national_id: null, user_id: 'u1', created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'b2', name: 'فاطمة', share_percentage: 25, phone: null, email: null, bank_account: null, notes: null, national_id: null, user_id: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'b3', name: 'عبدالله', share_percentage: 0, phone: null, email: null, bank_account: null, notes: null, national_id: null, user_id: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
];

vi.mock('@/hooks/data/beneficiaries/useBeneficiaries', () => ({
  useBeneficiaries: () => ({
    data: mockBeneficiaries,
    isLoading: false,
    page: 1, nextPage: vi.fn(), prevPage: vi.fn(),
    hasNextPage: false, hasPrevPage: false, pageSize: 50,
  }),
  useBeneficiariesDecrypted: () => ({ data: mockBeneficiaries }),
  useCreateBeneficiary: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useUpdateBeneficiary: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useDeleteBeneficiary: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
}));

vi.mock('@/hooks/data/beneficiaries/useBeneficiaryUsers', () => ({
  useBeneficiaryUsers: () => ({
    data: [
      { id: 'u1', email: 'a@b.com' },
      { id: 'u2', email: 'c@d.com' },
    ],
  }),
}));

vi.mock('@/lib/notify', () => ({
  defaultNotify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useBeneficiariesPage', () => {
  beforeEach(() => vi.clearAllMocks());

  const loadHook = async () => {
    const mod = await import('./useBeneficiariesPage');
    return mod.useBeneficiariesPage;
  };

  it('يحسب إجمالي النسب بشكل صحيح', async () => {
    const useBeneficiariesPage = await loadHook();
    const { result } = renderHook(() => useBeneficiariesPage(), { wrapper: createWrapper() });
    // 30 + 25 + 0 = 55
    expect(result.current.totalPercentage).toBe(55);
    expect(result.current.percentageExceeds).toBe(false);
  });

  it('يحسب المستفيدين النشطين (نسبة > 0)', async () => {
    const useBeneficiariesPage = await loadHook();
    const { result } = renderHook(() => useBeneficiariesPage(), { wrapper: createWrapper() });
    expect(result.current.activeBeneficiaries).toBe(2);
  });

  it('يصفّي حسب الاسم', async () => {
    const useBeneficiariesPage = await loadHook();
    const { result } = renderHook(() => useBeneficiariesPage(), { wrapper: createWrapper() });
    act(() => result.current.setSearchQuery('فاطمة'));
    expect(result.current.filteredBeneficiaries).toHaveLength(1);
    expect(result.current.filteredBeneficiaries[0]!.name).toBe('فاطمة');
  });

  it('يصفّي حسب رقم الهاتف', async () => {
    const useBeneficiariesPage = await loadHook();
    const { result } = renderHook(() => useBeneficiariesPage(), { wrapper: createWrapper() });
    act(() => result.current.setSearchQuery('0501234567'));
    expect(result.current.filteredBeneficiaries).toHaveLength(1);
  });

  it('يعرض كل المستفيدين بدون فلتر', async () => {
    const useBeneficiariesPage = await loadHook();
    const { result } = renderHook(() => useBeneficiariesPage(), { wrapper: createWrapper() });
    expect(result.current.filteredBeneficiaries).toHaveLength(3);
  });

  it('يحسب المستخدمين المتاحين للربط (يستبعد المربوطين)', async () => {
    const useBeneficiariesPage = await loadHook();
    const { result } = renderHook(() => useBeneficiariesPage(), { wrapper: createWrapper() });
    // u1 مربوط بـ b1 → المتاح = u2 فقط
    expect(result.current.availableUsers).toHaveLength(1);
    expect(result.current.availableUsers[0]!.id).toBe('u2');
  });

  it('handleEdit يملأ النموذج ببيانات المستفيد', async () => {
    const useBeneficiariesPage = await loadHook();
    const { result } = renderHook(() => useBeneficiariesPage(), { wrapper: createWrapper() });
    act(() => result.current.handleEdit(mockBeneficiaries[0]!));
    expect(result.current.isOpen).toBe(true);
    expect(result.current.formData.name).toBe('محمد');
    expect(result.current.formData.share_percentage).toBe('30');
  });

  it('resetForm يُعيد النموذج للحالة الأولية', async () => {
    const useBeneficiariesPage = await loadHook();
    const { result } = renderHook(() => useBeneficiariesPage(), { wrapper: createWrapper() });
    act(() => result.current.handleEdit(mockBeneficiaries[0]!));
    act(() => result.current.resetForm());
    expect(result.current.formData.name).toBe('');
  });
});
