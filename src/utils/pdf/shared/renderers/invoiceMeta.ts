/**
 * رسم معلومات الفاتورة (رقم + تاريخ + عقد + عقار)
 */
import type jsPDF from 'jspdf';
import { reshapeArabic as rs } from '../../core';
import type { PaymentInvoicePdfData } from '../types';

/** رسم بيانات الفاتورة الوصفية */
export const renderInvoiceMeta = (
  doc: jsPDF, fontFamily: string, invoice: PaymentInvoicePdfData,
  startY: number, _pageW: number, compact = false,
) => {
  const margin = 18;
  let y = startY;

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(compact ? 7 : 8);

  const leftItems = [
    [rs(`رقم الفاتورة: ${invoice.invoiceNumber}`)],
    [rs(`التاريخ: ${invoice.dueDate}`)],
    [rs(`رقم العقد: ${invoice.contractNumber}`)],
    [rs(`العقار: ${invoice.propertyNumber}`)],
    [rs(`الدفعة: ${invoice.paymentNumber} من ${invoice.totalPayments}`)],
  ];

  for (const item of leftItems) {
    doc.text(item[0] ?? '', margin, y, { align: 'left' });
    y += compact ? 4 : 5;
  }

  return y;
};
