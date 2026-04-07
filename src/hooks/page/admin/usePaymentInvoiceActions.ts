/**
 * هوك إجراءات فواتير الدفع — دفع وإلغاء دفع ودفع جماعي
 * مُستخرج من usePaymentInvoicesTab لتقليل حجم الملف الأصلي (#22)
 */
import { useState, useCallback } from 'react';
import { defaultNotify } from '@/lib/notify';
import {
  type PaymentInvoice,
  useMarkInvoicePaid,
  useMarkInvoiceUnpaid,
} from '@/hooks/data/invoices/usePaymentInvoices';

export function usePaymentInvoiceActions() {
  const markPaid = useMarkInvoicePaid();
  const markUnpaid = useMarkInvoiceUnpaid();

  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [payDialog, setPayDialog] = useState<{ inv: PaymentInvoice } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPaying, setBulkPaying] = useState(false);

  const openPayDialog = (inv: PaymentInvoice) => {
    setPayDialog({ inv });
    setPayAmount(String(inv.amount ?? 0));
  };

  const handlePay = () => {
    if (!payDialog) return;
    const amount = parseFloat(payAmount);
    if (!(amount > 0)) { defaultNotify.error('يرجى إدخال مبلغ صحيح'); return; }
    const inv = payDialog.inv;
    setPayingInvoiceId(inv.id);
    setPayDialog(null);
    markPaid.mutate(
      { invoiceId: inv.id, paidAmount: amount },
      { onSettled: () => setPayingInvoiceId(null) },
    );
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleSelectAll = (unpaidIds: string[]) => {
    if (selectedIds.size === unpaidIds.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(unpaidIds));
  };

  const handleBulkPay = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkPaying(true);
    const ids = [...selectedIds];
    let done = 0;
    for (const id of ids) {
      try {
        await markPaid.mutateAsync({ invoiceId: id });
        done++;
      } catch { /* يتابع */ }
    }
    setBulkPaying(false);
    setSelectedIds(new Set());
    defaultNotify.success(`تم تسديد ${done} فاتورة من ${ids.length}`);
  }, [selectedIds, markPaid]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  return {
    markPaid, markUnpaid,
    payingInvoiceId, payDialog, setPayDialog, payAmount, setPayAmount,
    openPayDialog, handlePay,
    selectedIds, toggleSelect, toggleSelectAll, bulkPaying, handleBulkPay, clearSelection,
  };
}
