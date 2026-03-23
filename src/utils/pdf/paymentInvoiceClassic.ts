/**
 * قالب الفاتورة الكلاسيكي
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PdfWaqfInfo, TABLE_HEAD_GREEN, baseTableStyles, headStyles, reshapeArabic as rs, reshapeRow } from './core';
import { getLastAutoTableY } from './pdfHelpers';
import { fmt } from '@/utils/format';
import {
  type PaymentInvoicePdfData, statusLabel,
  renderSellerInfo, renderBankDetails, renderQrCode,
} from './paymentInvoiceShared';

export const renderClassic = async (
  doc: jsPDF, fontFamily: string, invoice: PaymentInvoicePdfData,
  waqfInfo?: PdfWaqfInfo,
) => {
  const pageW = doc.internal.pageSize.width;
  const margin = 18;

  let y = 15;
  y = renderSellerInfo(doc, fontFamily, waqfInfo, y, pageW);
  y += 2;

  // خط ذهبي فاصل
  doc.setDrawColor(202, 138, 4);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // عنوان الفاتورة
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  const vatRate = invoice.vatRate ?? 0;
  const vatAmount = invoice.vatAmount ?? 0;
  const isVat = vatRate > 0;
  const title = isVat ? rs('فاتورة ضريبية مبسّطة') : rs('فاتورة دفعة مستحقة');
  doc.text(title, 105, y + 2, { align: 'center' });
  y += 12;

  // جدول key-value
  const rows: string[][] = [
    [rs('رقم الفاتورة'), rs(invoice.invoiceNumber)],
    [rs('رقم العقد'), rs(invoice.contractNumber)],
    [rs('المستأجر'), rs(invoice.tenantName)],
    [rs('العقار'), rs(invoice.propertyNumber)],
    [rs('رقم الدفعة'), rs(`${invoice.paymentNumber} من ${invoice.totalPayments}`)],
  ];

  if (isVat) {
    const amountExVat = invoice.amount - vatAmount;
    rows.push([rs('المبلغ قبل الضريبة'), rs(`${fmt(amountExVat)} ر.س`)]);
    rows.push([rs(`ضريبة القيمة المضافة (${vatRate}%)`), rs(`${fmt(vatAmount)} ر.س`)]);
    rows.push([rs('الإجمالي شاملاً الضريبة'), rs(`${fmt(invoice.amount)} ر.س`)]);
  } else {
    rows.push([rs('المبلغ'), rs(`${fmt(invoice.amount)} ر.س`)]);
  }

  rows.push([rs('تاريخ الاستحقاق'), rs(invoice.dueDate)]);
  rows.push([rs('الحالة'), statusLabel(invoice.status)]);

  if (!isVat) rows.push([rs('ضريبة القيمة المضافة'), rs('معفاة من ضريبة القيمة المضافة')]);
  if (invoice.paidDate) rows.push([rs('تاريخ السداد'), rs(invoice.paidDate)]);
  if (invoice.paidAmount && invoice.paidAmount > 0) rows.push([rs('المبلغ المسدد'), rs(`${fmt(invoice.paidAmount)} ر.س`)]);
  if (invoice.notes) rows.push([rs('ملاحظات'), rs(invoice.notes)]);

  autoTable(doc, {
    startY: y,
    head: [reshapeRow(['البيان', 'التفاصيل'])],
    body: rows,
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
    columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
  });

  const finalY = getLastAutoTableY(doc, y + 100);

  renderBankDetails(doc, fontFamily, waqfInfo, finalY, pageW);

  await renderQrCode(doc, fontFamily, invoice, waqfInfo, 82.5, finalY + 2, 45);

  const noteY = finalY + 52;
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(rs('هذه الفاتورة صادرة إلكترونياً من نظام إدارة الوقف'), 105, noteY, { align: 'center' });
  doc.setTextColor(0, 0, 0);
};
