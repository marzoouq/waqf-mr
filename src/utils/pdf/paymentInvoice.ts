/**
 * نقطة دخول فواتير الدفعات — يوجه للقالب المناسب
 * القوالب الفعلية في: paymentInvoiceClassic, paymentInvoiceProfessional, paymentInvoiceCompact
 * الدوال المشتركة في: paymentInvoiceShared
 */
import { loadArabicFont, addFooter } from './core';
import type { PdfWaqfInfo } from './core';
import { supabase } from '@/integrations/supabase/client';

// إعادة تصدير الأنواع والدوال المشتركة للتوافق
export type { InvoiceTemplate, PaymentInvoicePdfData, PaymentInvoiceLineItem, PdfAllowanceChargeItem } from './paymentInvoiceShared';
export { renderBuyerInfo, renderInvoiceMeta, sanitizePath } from './paymentInvoiceShared';
import { type InvoiceTemplate, type PaymentInvoicePdfData, sanitizePath } from './paymentInvoiceShared';

import { renderClassic } from './paymentInvoiceClassic';
import { renderTaxProfessional } from './paymentInvoiceProfessional';
import { renderCompact } from './paymentInvoiceCompact';

/* ─── الدالة الرئيسية ─── */
export const generatePaymentInvoicePDF = async (
  invoice: PaymentInvoicePdfData,
  waqfInfo?: PdfWaqfInfo,
  template: InvoiceTemplate = 'tax_professional',
): Promise<string | null> => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  // رسم القالب المختار
  switch (template) {
    case 'classic':
      await renderClassic(doc, fontFamily, invoice, waqfInfo);
      break;
    case 'compact':
      await renderCompact(doc, fontFamily, invoice, waqfInfo);
      break;
    case 'tax_professional':
    default:
      await renderTaxProfessional(doc, fontFamily, invoice, waqfInfo);
      break;
  }

  // تذييل (كلاسيكي و ضريبي فقط — المختصر بدون إطار)
  if (template !== 'compact') {
    addFooter(doc, fontFamily, waqfInfo);
  }

  // Upload to Storage
  try {
    const pdfBlob = doc.output('blob');
    const safeNumber = sanitizePath(invoice.invoiceNumber);
    const storagePath = `payment-invoices/${safeNumber}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(storagePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      const timestampPath = `payment-invoices/${sanitizePath(invoice.invoiceNumber)}-${Date.now()}.pdf`;
      const { error: retryError } = await supabase.storage
        .from('invoices')
        .upload(timestampPath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (!retryError) {
        await supabase
          .from('payment_invoices')
          .update({ file_path: timestampPath })
          .eq('id', invoice.id);
      }
    } else if (!uploadError) {
      await supabase
        .from('payment_invoices')
        .update({ file_path: storagePath })
        .eq('id', invoice.id);
    }

    return URL.createObjectURL(pdfBlob);
  } catch {
    doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
    return null;
  }
};
