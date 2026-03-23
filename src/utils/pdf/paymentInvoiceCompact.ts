/**
 * القالب المختصر للفاتورة
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PdfWaqfInfo, TABLE_HEAD_GREEN, baseTableStyles, reshapeArabic as rs } from './core';
import { getLastAutoTableY } from './pdfHelpers';
import { fmt } from '@/utils/format';
import {
  type PaymentInvoicePdfData, statusLabel,
  computePdfTotals, renderAllowanceChargeTable, renderQrCode,
} from './paymentInvoiceShared';

export const renderCompact = async (
  doc: jsPDF, fontFamily: string, invoice: PaymentInvoicePdfData,
  waqfInfo?: PdfWaqfInfo,
) => {
  const pageW = doc.internal.pageSize.width;
  const margin = 14;
  let y = 12;

  // اسم الوقف + عنوان مختصر
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(11);
  if (waqfInfo?.waqfName) {
    doc.text(waqfInfo.waqfName, pageW / 2, y, { align: 'center' });
    y += 6;
  }

  const vatRate = invoice.vatRate ?? 0;
  const isVat = vatRate > 0;
  doc.setFontSize(10);
  doc.text(isVat ? rs('فاتورة ضريبية مبسّطة') : rs('فاتورة'), pageW / 2, y, { align: 'center' });
  y += 4;

  doc.setDrawColor(22, 101, 52);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  // معلومات أساسية في سطر واحد
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(7);
  const metaLine = `الفاتورة: ${invoice.invoiceNumber}  |  العقد: ${invoice.contractNumber}  |  المستأجر: ${invoice.tenantName}  |  العقار: ${invoice.propertyNumber}`;
  doc.text(metaLine, pageW / 2, y, { align: 'center' });
  y += 4;
  doc.text(`الدفعة ${invoice.paymentNumber} من ${invoice.totalPayments}  |  الاستحقاق: ${invoice.dueDate}  |  الحالة: ${statusLabel(invoice.status)}`, pageW / 2, y, { align: 'center' });
  y += 6;

  // جدول بنود مبسّط
  const totals = computePdfTotals(invoice);
  const compactVatAmount = invoice.vatAmount ?? 0;
  const compactAmountExVat = invoice.amount - compactVatAmount;

  autoTable(doc, {
    startY: y,
    head: [['الوصف', 'المبلغ', 'الضريبة', 'الإجمالي']],
    body: [[
      `إيجار — دفعة ${invoice.paymentNumber}`,
      fmt(compactAmountExVat),
      `${fmt(compactVatAmount)} (${vatRate}%)`,
      `${fmt(invoice.amount)} ر.س`,
    ]],
    theme: 'grid',
    ...baseTableStyles(fontFamily),
    headStyles: {
      fillColor: TABLE_HEAD_GREEN,
      font: fontFamily,
      fontStyle: 'bold' as const,
      fontSize: 7,
      cellPadding: 2,
    },
    styles: {
      halign: 'center' as const,
      font: fontFamily,
      fontStyle: 'normal' as const,
      cellPadding: 2,
      fontSize: 7,
    },
  });

  let tableEndY = getLastAutoTableY(doc, y + 25);

  // خصومات/رسوم إضافية
  tableEndY = renderAllowanceChargeTable(doc, fontFamily, invoice, tableEndY + 2);

  let endY = tableEndY + 4;

  // سطر الإجمالي
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(10);
  doc.text(`الإجمالي: ${fmt(totals.grandTotal)} ر.س`, pageW / 2, endY, { align: 'center' });
  endY += 6;

  // بيانات الدفع مختصرة
  if (waqfInfo?.bankIBAN) {
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(7);
    const bankLine = [waqfInfo.bankName, waqfInfo.bankIBAN].filter(Boolean).join('  |  IBAN: ');
    doc.text(bankLine, pageW / 2, endY, { align: 'center' });
    endY += 5;
  }

  // QR مصغّر
  await renderQrCode(doc, fontFamily, invoice, waqfInfo, (pageW - 25) / 2, endY, 25);
  endY += 28;

  // ملاحظة
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text(rs('فاتورة إلكترونية — نظام إدارة الوقف'), pageW / 2, endY, { align: 'center' });
  doc.setTextColor(0, 0, 0);
};
