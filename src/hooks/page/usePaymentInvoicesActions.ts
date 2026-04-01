/**
 * عمليات الدفع والمعاينة لفواتير الدفعات
 * مستخرج من usePaymentInvoicesTab لتقليل حجم الملف
 */
import { useState, useCallback, useMemo } from 'react';
import { safeNumber } from '@/utils/safeNumber';
import { toast } from 'sonner';
import {
  type PaymentInvoice,
  useMarkInvoicePaid,
  useMarkInvoiceUnpaid,
} from '@/hooks/data/usePaymentInvoices';
import type { Contract } from '@/types/database';
import { usePdfWaqfInfo } from '@/hooks/data/usePdfWaqfInfo';
import type { InvoicePreviewData } from '@/components/invoices/InvoicePreviewDialog';

export const usePaymentInvoicesActions = (contracts: Contract[]) => {
  const markPaid = useMarkInvoicePaid();
  const markUnpaid = useMarkInvoiceUnpaid();
  const waqfInfo = usePdfWaqfInfo();

  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [payDialog, setPayDialog] = useState<{ inv: PaymentInvoice } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [previewInvoice, setPreviewInvoice] = useState<InvoicePreviewData | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPaying, setBulkPaying] = useState(false);

  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleSelectAllFor = useCallback((unpaidFiltered: PaymentInvoice[]) => {
    if (selectedIds.size === unpaidFiltered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(unpaidFiltered.map(i => i.id)));
  }, [selectedIds.size]);

  const handleBulkPay = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkPaying(true);
    const ids = [...selectedIds];
    let done = 0;
    for (const id of ids) {
      try { await markPaid.mutateAsync({ invoiceId: id }); done++; } catch { /* يتابع */ }
    }
    setBulkPaying(false);
    setSelectedIds(new Set());
    toast.success(`تم تسديد ${done} فاتورة من ${ids.length}`);
  }, [selectedIds, markPaid]);

  const openPayDialog = (inv: PaymentInvoice) => {
    setPayDialog({ inv });
    setPayAmount(String(safeNumber(inv.amount)));
  };

  const handlePay = () => {
    if (!payDialog) return;
    const amount = parseFloat(payAmount);
    if (!(amount > 0)) { toast.error('يرجى إدخال مبلغ صحيح'); return; }
    const inv = payDialog.inv;
    setPayingInvoiceId(inv.id);
    setPayDialog(null);
    markPaid.mutate(
      { invoiceId: inv.id, paidAmount: amount },
      { onSettled: () => setPayingInvoiceId(null) },
    );
  };

  const buildPaymentPreviewData = useCallback((inv: PaymentInvoice): InvoicePreviewData => {
    const fullContract = contracts.find(c => c.id === inv.contract_id);
    const hasBuyerTax = !!fullContract?.tenant_tax_number;
    const hasVat = safeNumber(inv.vat_rate) > 0;
    const amountExVat = safeNumber(inv.vat_amount) > 0
      ? safeNumber(inv.amount) - safeNumber(inv.vat_amount)
      : (safeNumber(inv.vat_rate) > 0 ? safeNumber(inv.amount) / (1 + safeNumber(inv.vat_rate) / 100) : safeNumber(inv.amount));

    return {
      invoiceNumber: inv.invoice_number, date: inv.due_date,
      type: (hasVat && hasBuyerTax) ? 'standard' : 'simplified',
      sellerName: waqfInfo.waqfName || 'وقف مرزوق بن علي الثبيتي',
      sellerAddress: waqfInfo.address, sellerVatNumber: waqfInfo.vatNumber,
      sellerCR: waqfInfo.commercialReg, sellerLogo: waqfInfo.logoUrl,
      buyerName: fullContract?.tenant_name || inv.contract?.tenant_name || '-',
      buyerVatNumber: fullContract?.tenant_tax_number || undefined,
      buyerCR: fullContract?.tenant_crn || undefined,
      buyerIdType: fullContract?.tenant_id_type || undefined,
      buyerIdNumber: fullContract?.tenant_id_number || undefined,
      buyerStreet: fullContract?.tenant_street || undefined,
      buyerDistrict: fullContract?.tenant_district || undefined,
      buyerCity: fullContract?.tenant_city || undefined,
      buyerPostalCode: fullContract?.tenant_postal_code || undefined,
      buyerBuilding: fullContract?.tenant_building || undefined,
      items: [{
        description: `إيجار — دفعة ${inv.payment_number}${inv.contract?.contract_number ? ` / عقد ${inv.contract.contract_number}` : ''}`,
        quantity: 1, unitPrice: amountExVat, vatRate: safeNumber(inv.vat_rate),
      }],
      notes: inv.notes || undefined, status: inv.status,
      bankName: waqfInfo.bankName, bankIBAN: waqfInfo.bankIBAN,
      zatcaUuid: inv.zatca_uuid || undefined, zatcaStatus: inv.zatca_status || undefined,
    };
  }, [contracts, waqfInfo]);

  const handlePreviewTemplate = (inv: PaymentInvoice) => {
    setPreviewInvoice(buildPaymentPreviewData(inv));
  };

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  return {
    // تحديد جماعي
    selectedIds, toggleSelect, toggleSelectAllFor, bulkPaying, handleBulkPay, clearSelection,
    // تسديد
    payingInvoiceId, payDialog, setPayDialog, payAmount, setPayAmount, openPayDialog, handlePay,
    // معاينة
    previewInvoice, setPreviewInvoice, handlePreviewTemplate,
    // mutations
    markPaid, markUnpaid, waqfInfo,
  };
};
