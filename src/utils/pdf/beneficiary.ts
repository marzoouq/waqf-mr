import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PdfWaqfInfo, loadArabicFont, addHeader, addHeaderToAllPages, addFooter,
  TABLE_HEAD_GREEN, TABLE_HEAD_GOLD, TABLE_HEAD_RED,
  baseTableStyles, headStyles,
} from './core';

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
  doc.text('تقرير حصتي من الريع', 105, startY + 5, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(fontFamily, 'normal');
  doc.text(`المستفيد: ${data.beneficiaryName}`, 105, startY + 16, { align: 'center' });

  autoTable(doc, {
    startY: startY + 24,
    head: [['البيان', 'القيمة']],
    body: [
      ['إجمالي ريع الوقف', `${data.netRevenue.toLocaleString()} ر.س`],
      ['إجمالي ريع الوقف', `${data.netRevenue.toLocaleString()} ر.س`],
      ['(-) حصة الناظر (10%)', `${data.adminShare.toLocaleString()} ر.س`],
      ['(-) حصة الواقف (5%)', `${data.waqifShare.toLocaleString()} ر.س`],
      ['صافي ريع المستفيدين', `${data.beneficiariesShare.toLocaleString()} ر.س`],
      ['حصتي المستحقة', `${data.myShare.toLocaleString()} ر.س`],
      ['المبالغ المستلمة', `${data.totalReceived.toLocaleString()} ر.س`],
      ['المبالغ المعلقة', `${data.pendingAmount.toLocaleString()} ر.س`],
    ],
    theme: 'grid',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  if (data.distributions.length > 0) {
    const finalY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 105) + 15;
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(14);
    doc.text('سجل التوزيعات', 105, finalY, { align: 'center' });

    autoTable(doc, {
      startY: finalY + 8,
      head: [['التاريخ', 'السنة المالية', 'المبلغ', 'الحالة']],
      body: data.distributions.map(d => [
        d.date,
        d.fiscalYear,
        `${d.amount.toLocaleString()} ر.س`,
        d.status === 'paid' ? 'مستلم' : 'معلق',
      ]),
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
  doc.text('الإفصاح السنوي', 105, startY + 5, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(fontFamily, 'normal');
  doc.text(`السنة المالية: ${data.fiscalYear}`, 105, startY + 16, { align: 'center' });

  // Income
  autoTable(doc, {
    startY: startY + 24,
    head: [['المصدر', 'المبلغ (ر.س)']],
    body: [
      ...Object.entries(data.incomeBySource).map(([source, amount]) => [source, `+${amount.toLocaleString()}`]),
      [{ content: 'إجمالي الإيرادات', styles: { fontStyle: 'bold' } }, { content: `+${data.totalIncome.toLocaleString()}`, styles: { fontStyle: 'bold' } }],
    ],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  let y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 90) + 10;

  // Expenses
  autoTable(doc, {
    startY: y,
    head: [['النوع', 'المبلغ (ر.س)']],
    body: [
      ...Object.entries(data.expensesByType).map(([type, amount]) => [type, `-${amount.toLocaleString()}`]),
      [{ content: 'إجمالي المصروفات', styles: { fontStyle: 'bold' } }, { content: `-${data.totalExpenses.toLocaleString()}`, styles: { fontStyle: 'bold' } }],
    ],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_RED, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 150) + 10;

  // Distribution
  autoTable(doc, {
    startY: y,
    head: [['البند', 'المبلغ (ر.س)']],
    body: [
      ['صافي الريع', data.netRevenue.toLocaleString()],
      ['حصة الناظر (10%)', `-${data.adminShare.toLocaleString()}`],
      ['حصة الواقف (5%)', `-${data.waqifShare.toLocaleString()}`],
      ['صافي ريع المستفيدين', data.beneficiariesShare.toLocaleString()],
      [{ content: 'حصتي المستحقة', styles: { fontStyle: 'bold' } }, { content: `${data.myShare.toLocaleString()} ر.س`, styles: { fontStyle: 'bold' } }],
    ],
    theme: 'grid',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save(`disclosure-${data.fiscalYear}.pdf`);
};
