/**
 * اختبارات useAdvanceRequestsState — pagination + reject flow + approve/paid
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const mutate = vi.fn();
const mutateAsync = vi.fn();

const mkReq = (id: string) => ({ id, amount: 1000, status: 'pending', beneficiary: { user_id: `u-${id}` } });
const requests = Array.from({ length: 45 }, (_, i) => mkReq(`r${i}`));

vi.mock('@/hooks/data/financial/advances/useAdvanceRequests', () => ({
  useAdvanceRequests: () => ({ data: requests, isLoading: false }),
  useUpdateAdvanceStatus: () => ({ mutate, mutateAsync, isPending: false }),
  STATUS_SUCCESS_MESSAGES: { approved: 'تمت الموافقة', paid: 'تم الصرف', rejected: 'تم الرفض' },
}));

vi.mock('@/lib/notify', () => ({
  uiNotify: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/contexts/FiscalYearContext', () => ({
  useFiscalYear: () => ({ fiscalYearId: 'fy1' }),
}));

vi.mock('@/hooks/data/settings/app/useAppSettings', () => ({
  useAppSettings: () => ({ getJsonSetting: (_k: string, d: unknown) => d }),
}));

vi.mock('@/constants/fiscalYearIds', () => ({ isFyAll: (id: string) => id === 'all' }));

const loadHook = async () => (await import('./useAdvanceRequestsState')).useAdvanceRequestsState;

describe('useAdvanceRequestsState', () => {
  beforeEach(() => { vi.clearAllMocks(); mutateAsync.mockResolvedValue({}); });

  it('يحسب totalPages بشكل صحيح (PAGE_SIZE=20)', async () => {
    const h = await loadHook();
    const { result } = renderHook(() => h());
    expect(result.current.totalPages).toBe(3); // ceil(45/20)
    expect(result.current.paginatedRequests).toHaveLength(20);
  });

  it('paginatedRequests يحترم page', async () => {
    const h = await loadHook();
    const { result } = renderHook(() => h());
    act(() => result.current.setPage(2));
    expect(result.current.paginatedRequests).toHaveLength(5); // 45 - 40
  });

  it('handleApprove يستدعي mutate بـ approved + بيانات المستفيد', async () => {
    const h = await loadHook();
    const { result } = renderHook(() => h());
    act(() => result.current.handleApprove(requests[0]! as never));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'r0', status: 'approved', beneficiary_user_id: 'u-r0', amount: 1000,
      }),
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it('handlePaid يستدعي mutate بـ paid', async () => {
    const h = await loadHook();
    const { result } = renderHook(() => h());
    act(() => result.current.handlePaid(requests[0]! as never));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'paid' }),
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it('openReject يفتح والـ closeReject يفرّغ', async () => {
    const h = await loadHook();
    const { result } = renderHook(() => h());
    act(() => result.current.openReject(requests[0]! as never));
    expect(result.current.rejectTarget?.id).toBe('r0');
    act(() => result.current.setRejectionReason('سبب'));
    act(() => result.current.closeReject());
    expect(result.current.rejectTarget).toBeNull();
    expect(result.current.rejectionReason).toBe('');
  });

  it('handleReject ينفذ ويُغلق الحوار', async () => {
    const h = await loadHook();
    const { result } = renderHook(() => h());
    act(() => result.current.openReject(requests[0]! as never));
    act(() => result.current.setRejectionReason('غير مكتمل'));
    act(() => { result.current.handleReject(); });
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'r0', status: 'rejected', rejection_reason: 'غير مكتمل' }),
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    // محاكاة نجاح mutation: استدعِ onSuccess يدوياً
    const opts = mutate.mock.calls[0]![1] as { onSuccess: () => void };
    act(() => opts.onSuccess());
    await waitFor(() => expect(result.current.rejectTarget).toBeNull());
  });

  it('handleReject عند فشل المتحوّل يبقي الحوار مفتوحاً', async () => {
    const h = await loadHook();
    const { result } = renderHook(() => h());
    act(() => result.current.openReject(requests[1]! as never));
    act(() => { result.current.handleReject(); });
    const opts = mutate.mock.calls[0]![1] as { onError: () => void };
    act(() => opts.onError());
    expect(result.current.rejectTarget?.id).toBe('r1');
  });

  it('handleReject لا يفعل شيئاً بدون target', async () => {
    const h = await loadHook();
    const { result } = renderHook(() => h());
    act(() => { result.current.handleReject(); });
    expect(mutate).not.toHaveBeenCalled();
  });
});
