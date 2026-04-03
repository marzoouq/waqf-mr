/**
 * نقطة دخول فواتير الدفعات — يوجه للقالب المناسب
 * القوالب الفعلية في: paymentInvoiceClassic, paymentInvoiceProfessional, paymentInvoiceCompact
 * الدوال المشتركة في: paymentInvoiceShared
 *
 * ملاحظة: هذه الدالة تُرجع Blob فقط — الرفع والتخزين في lib/services/invoiceStorageService.ts
 */
import { loadArabicFont, addFooter } from '../core/core';
import type { PdfWaqfInfo } from '../core/core';

// إعادة تصدير الأنواع والدوال المشتركة للتوافق
export type { InvoiceTemplate, PaymentInvoicePdfData, PaymentInvoiceLineItem, PdfAllowanceChargeItem } from './paymentInvoiceShared';
export { renderBuyerInfo, renderInvoiceMeta, sanitizePath } from './paymentInvoiceShared';
import { type InvoiceTemplate, type PaymentInvoicePdfData } from './paymentInvoiceShared';

import { renderClassic } from './paymentInvoiceClassic';
import { renderTaxProfessional } from './paymentInvoiceProfessional';
import { renderCompact } from './paymentInvoiceCompact';

/* ─── الدالة الرئيسية — تُرجع Blob ─── */
export const generatePaymentInvoicePDF = async (
  invoice: PaymentInvoicePdfData,
  waqfInfo?: PdfWaqfInfo,
  template: InvoiceTemplate = 'tax_professional',
): Promise<Blob> => {
  const { default: jsPDF } = await import('jspdf');
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

  return doc.output('blob');
};
