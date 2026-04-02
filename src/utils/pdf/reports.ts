// autoTable يُحمّل ديناميكياً
import {
  PdfWaqfInfo, createPdfDocument, finalizePdf,
  TABLE_HEAD_GREEN, TABLE_HEAD_RED, TABLE_HEAD_GOLD,
  baseTableStyles, headStyles, footStyles,
  reshapeArabic as rs, reshapeRow,
} from './core';
import { getLastAutoTableY } from './pdfHelpers';
import { fmt } from '@/utils/format';


interface ReportData {
  fiscalYear: string;
  totalIncome: number;
  totalExpenses: number;
  netRevenue: number;
  adminShare: number;
  waqifShare: number;
  waqfRevenue: number;
  adminPct?: number;
  waqifPct?: number;
  expensesByType: Array<{ type: string; amount: number }>;
  incomeBySource: Array<{ source: string; amount: number }>;
  beneficiaries: Array<{
    name: string;
    percentage: number;
    amount: number;
  }>;
}

export const generateAnnualReportPDF = async (data: ReportData, waqfInfo?: PdfWaqfInfo, chartsImage?: string, chartsAspect?: number) => {
  const { default: autoTable } = await import('jspdf-autotable');
  const { doc, fontFamily, startY } = await createPdfDocument(waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text(rs('تقرير الوقف السنوي'), 105, startY + 5, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(fontFamily, 'normal');
  doc.text(rs(`السنة المالية: ${data.fiscalYear}`), 105, startY + 16, { align: 'center' });

  autoTable(doc, {
    startY: startY + 24,
    head: [reshapeRow(['البند', 'المبلغ (ر.س)'])],
    body: [
      reshapeRow([{ content: rs('-- الإيرادات --'), colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: [220, 252, 231] } }]),
      ...data.incomeBySource.map(i => reshapeRow([`  ${i.source}`, `+${fmt(i.amount)}`])),
      reshapeRow([{ content: rs('إجمالي الإيرادات'), styles: { fontStyle: 'bold' } }, { content: `+${fmt(data.totalIncome)}`, styles: { fontStyle: 'bold' } }]),
      reshapeRow([{ content: rs('-- المصروفات --'), colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: [254, 226, 226] } }]),
      ...data.expensesByType.map(e => reshapeRow([`  ${e.type}`, `-${fmt(e.amount)}`])),
      reshapeRow([{ content: rs('إجمالي المصروفات'), styles: { fontStyle: 'bold' } }, { content: `(${fmt(data.totalExpenses)})`, styles: { fontStyle: 'bold' } }]),
      reshapeRow(['صافي الريع', fmt(data.netRevenue)]),
      reshapeRow([`حصة الناظر (${data.adminPct ?? 10}%)`, fmt(data.adminShare)]),
      reshapeRow([`حصة الواقف (${data.waqifPct ?? 5}%)`, fmt(data.waqifShare)]),
      reshapeRow(['ريع المستفيدين', fmt(data.waqfRevenue)]),
    ],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  let finalY = getLastAutoTableY(doc, 100);

  // إضافة الرسوم البيانية كصورة إن وُجدت
  if (chartsImage) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const imgWidth = pageWidth - margin * 2;
    const aspect = chartsAspect || 1.5;
    const imgHeight = imgWidth / aspect;

    const pageHeight = doc.internal.pageSize.getHeight();
    if (finalY + imgHeight + 20 > pageHeight - 20) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFontSize(14);
    doc.setFont(fontFamily, 'bold');
    doc.text(rs('التحليل البياني'), 105, finalY + 12, { align: 'center' });

    const frameX = margin - 1;
    const frameY = finalY + 16;
    const frameW = imgWidth + 2;
    const frameH = imgHeight + 4;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.roundedRect(frameX, frameY, frameW, frameH, 2, 2, 'FD');

    doc.addImage(chartsImage, 'PNG', margin, finalY + 18, imgWidth, imgHeight);
    finalY = finalY + 18 + imgHeight + 8;
  }

  doc.setFontSize(14);
  doc.setFont(fontFamily, 'bold');
  doc.text(rs('توزيع حصص المستفيدين'), 105, finalY + 15, { align: 'center' });

  autoTable(doc, {
    startY: finalY + 22,
    head: [reshapeRow(['اسم المستفيد', 'المبلغ المستحق (ر.س)'])],
    body: data.beneficiaries.map(b => reshapeRow([
      b.name,
      fmt(b.amount),
    ])),
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GOLD, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  finalizePdf(doc, fontFamily, `waqf-report-${data.fiscalYear}.pdf`, waqfInfo);
};

export const generateBeneficiaryStatementPDF = async (beneficiaryName: string, sharePercentage: number, shareAmount: number, fiscalYear: string, waqfInfo?: PdfWaqfInfo) => {
  const { default: autoTable } = await import('jspdf-autotable');
  const { doc, fontFamily, startY } = await createPdfDocument(waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text(rs('كشف حساب المستفيد'), 105, startY + 5, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(fontFamily, 'normal');
  doc.text(rs(`السنة المالية: ${fiscalYear}`), 105, startY + 16, { align: 'center' });

  autoTable(doc, {
    startY: startY + 24,
    head: [reshapeRow(['البيان', 'القيمة'])],
    body: [
      reshapeRow(['اسم المستفيد', beneficiaryName]),
      reshapeRow(['نسبة الحصة', `${sharePercentage}%`]),
      reshapeRow(['مبلغ الحصة', `${fmt(shareAmount)} ر.س`]),
    ],
    theme: 'grid',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  finalizePdf(doc, fontFamily, `statement-${beneficiaryName}-${fiscalYear}.pdf`, waqfInfo, { skipHeaders: true });
};
