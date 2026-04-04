/**
 * رسم ملخص الضريبة وبيانات الدفع (البنك) في PDF
 */
import type jsPDF from 'jspdf';
import { PdfWaqfInfo, reshapeArabic as rs } from '../../core/core';
import { fmt } from '@/utils/format/format';
import type { PaymentInvoicePdfData } from '../types';
import { computePdfTotals } from '../computations';

/** رسم ملخص الضريبة — يدعم الخصومات والرسوم */
export const renderVatSummary = (
  doc: jsPDF, fontFamily: string, invoice: PaymentInvoicePdfData,
  startY: number, pageW: number,
) => {
  const margin = 18;
  const totals = computePdfTotals(invoice);
  let y = startY;

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(9);

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(pageW / 2, y, pageW - margin, y);
  y += 6;

  const summaryItems: [string, string][] = [
    [rs('إجمالي البنود:'), rs(`${fmt(totals.lineExtension)} ر.س`)],
  ];

  if (totals.totalAllowances > 0) {
    summaryItems.push([rs('خصومات:'), rs(`-${fmt(totals.totalAllowances)} ر.س`)]);
  }
  if (totals.totalCharges > 0) {
    summaryItems.push([rs('رسوم إضافية:'), rs(`+${fmt(totals.totalCharges)} ر.س`)]);
  }

  summaryItems.push(
    [rs('الإجمالي قبل الضريبة:'), rs(`${fmt(totals.taxExclusive)} ر.س`)],
    [rs('ضريبة القيمة المضافة:'), rs(`${fmt(totals.totalVat)} ر.س`)],
  );

  for (const [label, value] of summaryItems) {
    doc.text(label, pageW - margin - 60, y, { align: 'right' });
    doc.text(value, pageW - margin, y, { align: 'right' });
    y += 6;
  }

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(11);
  doc.text(rs('الإجمالي شاملاً الضريبة:'), pageW - margin - 60, y, { align: 'right' });
  doc.text(rs(`${fmt(totals.grandTotal)} ر.س`), pageW - margin, y, { align: 'right' });
  y += 4;

  return y;
};

/** رسم بيانات الدفع (البنك) */
export const renderBankDetails = (
  doc: jsPDF, fontFamily: string, waqfInfo: PdfWaqfInfo | undefined,
  startY: number, pageW: number,
) => {
  if (!waqfInfo?.bankName && !waqfInfo?.bankIBAN) return startY;
  const margin = 18;
  let y = startY + 4;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(9);
  doc.text(rs('بيانات الدفع'), pageW - margin, y, { align: 'right' });
  y += 5;

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(8);

  if (waqfInfo?.bankName) {
    doc.text(rs(`البنك: ${waqfInfo.bankName}`), pageW - margin, y, { align: 'right' });
    y += 5;
  }
  if (waqfInfo?.bankAccount) {
    doc.text(rs(`رقم الحساب: ${waqfInfo.bankAccount}`), pageW - margin, y, { align: 'right' });
    y += 5;
  }
  if (waqfInfo?.bankIBAN) {
    doc.text(`IBAN: ${waqfInfo.bankIBAN}`, margin, y, { align: 'left' });
    y += 5;
  }

  return y;
};
