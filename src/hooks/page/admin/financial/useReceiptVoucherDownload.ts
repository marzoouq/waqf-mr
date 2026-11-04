/**
 * تنزيل سند القبض الرسمي لفاتورة مسددة.
 */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePdfWaqfInfo } from '@/hooks/data/settings/waqf/usePdfWaqfInfo';
import { uiNotify } from '@/lib/notify';
import { logger } from '@/lib/logger';
import type { PaymentInvoice } from '@/types';

export const receiptVerifyUrl = (code: string) => `${window.location.origin}/verify/receipt/${code}`;

export function useReceiptVoucherDownload() {
  const waqfInfo = usePdfWaqfInfo();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const download = async (inv: PaymentInvoice) => {
    setLoadingId(inv.id);
    try {
      const { data, error } = await supabase
        .from('receipt_vouchers')
        .select('receipt_number,status,void_reason,paid_date,amount,payment_method,verification_code')
        .eq('payment_invoice_id', inv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) { uiNotify.error('لا يوجد سند قبض لهذه الفاتورة'); return; }
      const { generateReceiptVoucherPDF } = await import('@/utils/pdf/receipts/receiptVoucherPdf');
      await generateReceiptVoucherPDF({
        receiptNumber: data.receipt_number,
        status: data.status === 'void' ? 'void' : 'issued',
        voidReason: data.void_reason,
        paidDate: data.paid_date,
        amount: Number(data.amount),
        paymentMethod: data.payment_method,
        tenantName: inv.contract?.tenant_name ?? '-',
        contractNumber: inv.contract?.contract_number ?? '-',
        propertyNumber: inv.contract?.property?.property_number,
        invoiceNumber: inv.invoice_number,
        paymentNumber: inv.payment_number,
        paymentCount: inv.contract?.payment_count,
        dueDate: inv.due_date,
        remaining: Math.max(0, Number(inv.amount) - Number(data.amount)),
        verifyUrl: receiptVerifyUrl(data.verification_code),
      }, waqfInfo);
    } catch (err) {
      logger.error('receipt voucher download failed', err);
      uiNotify.error('تعذّر إصدار سند القبض');
    } finally {
      setLoadingId(null);
    }
  };

  return { download, loadingId };
}
