import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PdfWaqfInfo, loadArabicFont, addHeader, addHeaderToAllPages, addFooter,
  TABLE_HEAD_GREEN, TABLE_HEAD_GOLD, TABLE_HEAD_RED,
  baseTableStyles, headStyles,
  reshapeArabic as rs, reshapeRow,
} from './core';
import { getLastAutoTableY } from './pdfHelpers';
import { fmt } from '@/utils/format';

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
  adminPct?: number;
  waqifPct?: number;
  paidAdvances?: number;
  carryforwardDeducted?: number;
  fiscalYear?: string;
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

  // بنود الجدول الأساسية
  const bodyRows = [
    reshapeRow(['إجمالي ريع الوقف', `${fmt(data.netRevenue)} ر.س`]),
    reshapeRow(['نسبتي من الريع', `${data.sharePercentage}%`]),
    reshapeRow([`(-) حصة الناظر (${data.adminPct ?? 10}%)`, `${fmt(data.adminShare)} ر.س`]),
    reshapeRow([`(-) حصة الواقف (${data.waqifPct ?? 5}%)`, `${fmt(data.waqifShare)} ر.س`]),
    reshapeRow(['صافي ريع المستفيدين', `${fmt(data.beneficiariesShare)} ر.س`]),
    reshapeRow(['حصتي المستحقة', `${fmt(data.myShare)} ر.س`]),
    reshapeRow(['المبالغ المستلمة', `${fmt(data.totalReceived)} ر.س`]),
    reshapeRow(['المبالغ المعلقة', `${fmt(data.pendingAmount)} ر.س`]),
  ];

  // بنود السُلف والمرحّل (تظهر فقط إذا > 0)
  const advances = data.paidAdvances ?? 0;
  const cf = data.carryforwardDeducted ?? 0;
  if (advances > 0) {
    bodyRows.push(reshapeRow(['(-) السُلف المصروفة', `(${fmt(advances)}) ر.س`]));
  }
  if (cf > 0) {
    bodyRows.push(reshapeRow(['(-) فروق مرحّلة مخصومة', `(${fmt(cf)}) ر.س`]));
  }
  if (advances > 0 || cf > 0) {
    const net = Math.max(0, data.myShare - advances - cf);
    bodyRows.push(reshapeRow([{ content: rs('صافي المبلغ المستحق'), styles: { fontStyle: 'bold' as const } }, { content: `${fmt(net)} ر.س`, styles: { fontStyle: 'bold' as const } }]));
  }

  autoTable(doc, {
    startY: startY + 24,
    head: [reshapeRow(['البيان', 'القيمة'])],
    body: bodyRows,
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
        `${fmt(d.amount)} ر.س`,
        d.status === 'paid' ? 'مستلم' : 'معلق',
      ])),
      theme: 'striped',
      ...headStyles(TABLE_HEAD_GOLD, fontFamily),
      ...baseTableStyles(fontFamily),
    });
  }

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save(`my-share-${data.beneficiaryName}-${data.fiscalYear || 'all'}.pdf`);
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
      ...Object.entries(data.incomeBySource).map(([source, amount]) => reshapeRow([source, `+${fmt(amount)}`])),
      reshapeRow([{ content: rs('إجمالي الإيرادات'), styles: { fontStyle: 'bold' } }, { content: `+${fmt(data.totalIncome)}`, styles: { fontStyle: 'bold' } }]),
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
      ...Object.entries(data.expensesByType).map(([type, amount]) => reshapeRow([type, `-${fmt(amount)}`])),
      reshapeRow([{ content: rs('إجمالي المصروفات'), styles: { fontStyle: 'bold' } }, { content: `-${fmt(data.totalExpenses)}`, styles: { fontStyle: 'bold' } }]),
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
      reshapeRow(['صافي الريع', fmt(data.netRevenue)]),
      reshapeRow([`(-) حصة الناظر (${data.adminPct ?? 10}%)`, `-${fmt(data.adminShare)}`]),
      reshapeRow([`(-) حصة الواقف (${data.waqifPct ?? 5}%)`, `-${fmt(data.waqifShare)}`]),
      reshapeRow(['صافي ريع المستفيدين', fmt(data.beneficiariesShare)]),
      reshapeRow([{ content: rs('حصتي المستحقة'), styles: { fontStyle: 'bold' } }, { content: `${fmt(data.myShare)} ر.س`, styles: { fontStyle: 'bold' } }]),
    ],
    theme: 'grid',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save(`disclosure-${data.fiscalYear}.pdf`);
};
