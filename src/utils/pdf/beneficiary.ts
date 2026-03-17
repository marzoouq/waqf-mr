import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PdfWaqfInfo, loadArabicFont, addHeader, addHeaderToAllPages, addFooter,
  TABLE_HEAD_GREEN, TABLE_HEAD_GOLD, TABLE_HEAD_RED,
  baseTableStyles, headStyles,
  reshapeArabic as rs, reshapeRow,
} from './core';
import { getLastAutoTableY } from './pdfHelpers';

export const generateMySharePDF = async (data: {
  beneficiaryName: string;
  sharePercentage: number;
  myShare: number;
  totalReceived: number;
  pendingAmount: number;
  netRevenue: number;
  adminShare: number;
  waqifShare: number;
  beneficiariesShare: number;
  distributions: Array<{ date: string; fiscalYear: string; amount: number; status: string }>;
}, waqfInfo?: PdfWaqfInfo) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text(rs('تقرير حصتي من الريع'), 105, startY + 5, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(fontFamily, 'normal');
  doc.text(rs(`المستفيد: ${data.beneficiaryName}`), 105, startY + 16, { align: 'center' });

  autoTable(doc, {
    startY: startY + 24,
    head: [reshapeRow(['البيان', 'القيمة'])],
    body: [
      reshapeRow(['إجمالي ريع الوقف', `${data.netRevenue.toLocaleString()} ر.س`]),
      reshapeRow(['نسبتي من الريع', `${data.sharePercentage}%`]),
      reshapeRow([`(-) حصة الناظر (${data.netRevenue > 0 ? Math.round(data.adminShare / data.netRevenue * 100) : 10}%)`, `${data.adminShare.toLocaleString()} ر.س`]),
      reshapeRow([`(-) حصة الواقف (${data.netRevenue > 0 ? Math.round(data.waqifShare / data.netRevenue * 100) : 5}%)`, `${data.waqifShare.toLocaleString()} ر.س`]),
      reshapeRow(['صافي ريع المستفيدين', `${data.beneficiariesShare.toLocaleString()} ر.س`]),
      reshapeRow(['حصتي المستحقة', `${data.myShare.toLocaleString()} ر.س`]),
      reshapeRow(['المبالغ المستلمة', `${data.totalReceived.toLocaleString()} ر.س`]),
      reshapeRow(['المبالغ المعلقة', `${data.pendingAmount.toLocaleString()} ر.س`]),
    ],
    theme: 'grid',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  if (data.distributions.length > 0) {
    const finalY = getLastAutoTableY(doc, 105) + 15;
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(14);
    doc.text(rs('سجل التوزيعات'), 105, finalY, { align: 'center' });

    autoTable(doc, {
      startY: finalY + 8,
      head: [reshapeRow(['التاريخ', 'السنة المالية', 'المبلغ', 'الحالة'])],
      body: data.distributions.map(d => reshapeRow([
        d.date,
        d.fiscalYear,
        `${d.amount.toLocaleString()} ر.س`,
        d.status === 'paid' ? 'مستلم' : 'معلق',
      ])),
      theme: 'striped',
      ...headStyles(TABLE_HEAD_GOLD, fontFamily),
      ...baseTableStyles(fontFamily),
    });
  }

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save(`my-share-${data.beneficiaryName}.pdf`);
};

export const generateDisclosurePDF = async (data: {
  fiscalYear: string;
  beneficiaryName: string;
  sharePercentage: number;
  myShare: number;
  totalIncome: number;
  totalExpenses: number;
  netRevenue: number;
  adminShare: number;
  waqifShare: number;
  adminPct?: number;
  waqifPct?: number;
  beneficiariesShare: number;
  incomeBySource: Record<string, number>;
  expensesByType: Record<string, number>;
}, waqfInfo?: PdfWaqfInfo) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text(rs('الإفصاح السنوي'), 105, startY + 5, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(fontFamily, 'normal');
  doc.text(rs(`السنة المالية: ${data.fiscalYear}`), 105, startY + 16, { align: 'center' });

  // Income
  autoTable(doc, {
    startY: startY + 24,
    head: [reshapeRow(['المصدر', 'المبلغ (ر.س)'])],
    body: [
      ...Object.entries(data.incomeBySource).map(([source, amount]) => reshapeRow([source, `+${amount.toLocaleString()}`])),
      reshapeRow([{ content: rs('إجمالي الإيرادات'), styles: { fontStyle: 'bold' } }, { content: `+${data.totalIncome.toLocaleString()}`, styles: { fontStyle: 'bold' } }]),
    ],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  let y = getLastAutoTableY(doc, 90) + 10;

  // Expenses
  autoTable(doc, {
    startY: y,
    head: [reshapeRow(['النوع', 'المبلغ (ر.س)'])],
    body: [
      ...Object.entries(data.expensesByType).map(([type, amount]) => reshapeRow([type, `-${amount.toLocaleString()}`])),
      reshapeRow([{ content: rs('إجمالي المصروفات'), styles: { fontStyle: 'bold' } }, { content: `-${data.totalExpenses.toLocaleString()}`, styles: { fontStyle: 'bold' } }]),
    ],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_RED, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  y = getLastAutoTableY(doc, 150) + 10;

  // Distribution
  autoTable(doc, {
    startY: y,
    head: [reshapeRow(['البند', 'المبلغ (ر.س)'])],
    body: [
      reshapeRow(['صافي الريع', data.netRevenue.toLocaleString()]),
      reshapeRow([`(-) حصة الناظر (${data.adminPct ?? 10}%)`, `-${data.adminShare.toLocaleString()}`]),
      reshapeRow([`(-) حصة الواقف (${data.waqifPct ?? 5}%)`, `-${data.waqifShare.toLocaleString()}`]),
      reshapeRow(['صافي ريع المستفيدين', data.beneficiariesShare.toLocaleString()]),
      reshapeRow([{ content: rs('حصتي المستحقة'), styles: { fontStyle: 'bold' } }, { content: `${data.myShare.toLocaleString()} ر.س`, styles: { fontStyle: 'bold' } }]),
    ],
    theme: 'grid',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save(`disclosure-${data.fiscalYear}.pdf`);
};
