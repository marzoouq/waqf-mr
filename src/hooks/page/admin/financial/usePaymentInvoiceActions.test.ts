/**
 * اختبارات usePaymentInvoiceActions — اختيار/دفع/دفع جماعي
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const markPaidMutate = vi.fn();
const markPaidMutateAsync = vi.fn();
const markUnpaidMutate = vi.fn();
const notifySuccess = vi.fn();
const notifyError = vi.fn();

vi.mock('@/hooks/data/invoices/usePaymentInvoices', () => ({
  useMarkInvoicePaid: () => ({ mutate: markPaidMutate, mutateAsync: markPaidMutateAsync, isPending: false }),
  useMarkInvoiceUnpaid: () => ({ mutate: markUnpaidMutate, isPending: false }),
}));

vi.mock('@/lib/notify', () => ({
  uiNotify: { success: notifySuccess, error: notifyError, info: vi.fn(), warning: vi.fn() },
}));

const loadHook = async () => (await import('./usePaymentInvoiceActions')).usePaymentInvoiceActions;

describe('usePaymentInvoiceActions', () => {
  beforeEach(() => { vi.clearAllMocks(); markPaidMutateAsync.mockResolvedValue({}); });

  it('toggleSelect يضيف ويزيل المعرّفات', async () => {
    const h = await loadHook();
    const { result } = renderHook(() => h());
    act(() => result.current.toggleSelect('a'));
    expect(result.current.selectedIds.has('a')).toBe(true);
    act(() => result.current.toggleSelect('a'));
    expect(result.current.selectedIds.has('a')).toBe(false);
  });

  it('toggleSelectAll يحدد كل المعرّفات أو يفرغ', async () => {
    const h = await loadHook();
    const { result } = renderHook(() => h());
    act(() => result.current.toggleSelectAll(['1', '2', '3']));
    expect(result.current.selectedIds.size).toBe(3);
    act(() => result.current.toggleSelectAll(['1', '2', '3']));
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('openPayDialog يضبط مبلغ الفاتورة', async () => {
    const h = await loadHook();
    const { result } = renderHook(() => h());
    act(() => result.current.openPayDialog({ id: 'i1', amount: 1500 } as never));
    expect(result.current.payAmount).toBe('1500');
    expect(result.current.payDialog?.inv.id).toBe('i1');
  });

  it('handlePay يرفض المبالغ غير الصحيحة', async () => {
    const h = await loadHook();
    const { result } = renderHook(() => h());
    act(() => result.current.openPayDialog({ id: 'i1', amount: 100 } as never));
    act(() => result.current.setPayAmount('0'));
    act(() => result.current.handlePay());
    expect(notifyError).toHaveBeenCalledWith(expect.stringContaining('مبلغ'));
    expect(markPaidMutate).not.toHaveBeenCalled();
  });

  it('handlePay الصحيح يستدعي markPaid', async () => {
    const h = await loadHook();
    const { result } = renderHook(() => h());
    act(() => result.current.openPayDialog({ id: 'i1', amount: 100 } as never));
    act(() => result.current.handlePay());
    expect(markPaidMutate).toHaveBeenCalledWith(
      { invoiceId: 'i1', paidAmount: 100 },
      expect.any(Object),
    );
  });

  it('handleBulkPay يدفع كل الفواتير المختارة ويعرض النجاح', async () => {
    const h = await loadHook();
    const { result } = renderHook(() => h());
    act(() => result.current.toggleSelectAll(['a', 'b']));
    await act(async () => { await result.current.handleBulkPay(); });
    await waitFor(() => expect(markPaidMutateAsync).toHaveBeenCalledTimes(2));
    expect(notifySuccess).toHaveBeenCalledWith(expect.stringContaining('2'));
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('handleBulkPay يبلّغ بالفشل عند الإخفاق', async () => {
    markPaidMutateAsync.mockRejectedValueOnce(new Error('boom'));
    markPaidMutateAsync.mockResolvedValueOnce({});
    const h = await loadHook();
    const { result } = renderHook(() => h());
    act(() => result.current.toggleSelectAll(['a', 'b']));
    await act(async () => { await result.current.handleBulkPay(); });
    expect(notifyError).toHaveBeenCalledWith(expect.stringContaining('1'));
    expect(notifySuccess).toHaveBeenCalledWith(expect.stringContaining('1'));
  });

  it('handleBulkPay لا يفعل شيئاً عند عدم وجود اختيار', async () => {
    const h = await loadHook();
    const { result } = renderHook(() => h());
    await act(async () => { await result.current.handleBulkPay(); });
    expect(markPaidMutateAsync).not.toHaveBeenCalled();
  });
});
