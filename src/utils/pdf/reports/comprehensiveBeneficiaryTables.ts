import { startSectionPage } from '@/utils/pdf/core/pdfLayout';
/**
 * دوال بناء جداول التقرير الشامل للمستفيد — مستخرجة لتقليل حجم الملف الرئيسي
 * أقسام التسلسل المالي وحصتي مستخرجة في `comprehensiveBeneficiaryFinancial.ts`.
 */
import type { jsPDF } from 'jspdf';
import type { UserOptions } from 'jspdf-autotable';
import {
  PdfWaqfInfo,
  TABLE_HEAD_GREEN, TABLE_HEAD_GOLD, TABLE_HEAD_RED,
  baseTableStyles, headStyles, footStyles,
  reshapeArabic as rs, reshapeRow,
} from '../core/core';
import { getLastAutoTableY } from '../core/pdfHelpers';
import { fmt, fmtInt } from '@/utils/format/format';
import type { ComprehensiveBeneficiaryData } from './comprehensiveBeneficiary';

// إعادة تصدير دوال الأقسام المالية للحفاظ على الواجهة العامة
export { renderFinancialSequenceTable, renderShareTable } from './comprehensiveBeneficiaryFinancial';

type AutoTableFn = (doc: jsPDF, options: UserOptions) => void;

const ensureSpace = (doc: jsPDF, needed: number): number => {
  // كل قسم في صفحة مستقلة؛ needed يُبقى للتوافق
  void needed;
  return startSectionPage(doc, 25, getLastAutoTableY(doc) + 10);
};

/** القسم الثاني: ملخص العقود التشغيلية — إجماليات فقط، والتفاصيل في صفحة العقود */
export const renderContractsTable = (
  doc: jsPDF, autoTable: AutoTableFn, f: string, data: ComprehensiveBeneficiaryData, _waqfInfo?: PdfWaqfInfo,
) => {
  const y = ensureSpace(doc, 40);
  doc.setFont(f, 'bold');
  doc.setFontSize(14);
  doc.text(rs('ثانياً: ملخص العقود التشغيلية'), 192, y, { align: 'right' });

  const s = data.contractsSummary;
  if (s.total > 0) {
    autoTable(doc, {
      startY: y + 6,
      head: [reshapeRow(['البند', 'القيمة'])],
      body: [
        reshapeRow(['عدد العقود', fmtInt(s.total)]),
        reshapeRow(['عقود نشطة', fmtInt(s.active)]),
        reshapeRow(['عقود منتهية', fmtInt(s.expired)]),
        ...(s.cancelled > 0 ? [reshapeRow(['عقود ملغاة', fmtInt(s.cancelled)])] : []),
      ],
      foot: [reshapeRow(['إجمالي القيمة السنوية للعقود (ر.س)', fmt(s.annualValue)])],
      theme: 'striped',
      ...headStyles(TABLE_HEAD_GREEN, f),
      ...footStyles(TABLE_HEAD_GREEN, f),
      ...baseTableStyles(f),
    });
  } else {
    doc.setFont(f, 'normal');
    doc.setFontSize(10);
    doc.text(rs('لا توجد عقود مسجلة'), 105, y + 10, { align: 'center' });
  }
};

/** القسم الثالث: الإيرادات */
export const renderIncomeTable = (
  doc: jsPDF, autoTable: AutoTableFn, f: string, data: ComprehensiveBeneficiaryData,
) => {
  const y = ensureSpace(doc, 40);
  doc.setFont(f, 'bold');
  doc.setFontSize(14);
  doc.text(rs('ثالثاً: الإيرادات'), 192, y, { align: 'right' });

  autoTable(doc, {
    startY: y + 6,
    head: [reshapeRow(['المصدر', 'المبلغ (ر.س)'])],
    body: Object.entries(data.incomeBySource).map(([s, a]) => reshapeRow([s, `+${fmt(a)}`])),
    foot: [reshapeRow(['إجمالي الإيرادات', `+${fmt(data.totalIncome)}`])],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, f),
    ...footStyles(TABLE_HEAD_GREEN, f),
    ...baseTableStyles(f),
  });
};

/** القسم الرابع: المصروفات */
export const renderExpensesTable = (
  doc: jsPDF, autoTable: AutoTableFn, f: string, data: ComprehensiveBeneficiaryData,
) => {
  const y = ensureSpace(doc, 40);
  doc.setFont(f, 'bold');
  doc.setFontSize(14);
  doc.text(rs('رابعاً: المصروفات'), 192, y, { align: 'right' });

  autoTable(doc, {
    startY: y + 6,
    head: [reshapeRow(['النوع', 'المبلغ (ر.س)'])],
    body: Object.entries(data.expensesByType).map(([t, a]) => reshapeRow([t, `-${fmt(a)}`])),
    foot: [reshapeRow(['إجمالي المصروفات التشغيلية', `-${fmt(data.totalExpenses)}`])],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_RED, f),
    ...footStyles(TABLE_HEAD_RED, f),
    ...baseTableStyles(f),
  });
};

/** القسم السابع: سجل التوزيعات */
export const renderDistributionsTable = (
  doc: jsPDF, autoTable: AutoTableFn, f: string, data: ComprehensiveBeneficiaryData,
) => {
  if (data.distributions.length === 0) return;

  const y = ensureSpace(doc, 30);
  doc.setFont(f, 'bold');
  doc.setFontSize(14);
  doc.text(rs('سابعاً: سجل التوزيعات'), 192, y, { align: 'right' });

  autoTable(doc, {
    startY: y + 6,
    head: [reshapeRow(['التاريخ', 'السنة المالية', 'المبلغ (ر.س)', 'الحالة'])],
    body: data.distributions.map(d => reshapeRow([
      d.date,
      d.fiscalYear,
      fmt(d.amount),
      d.status === 'paid' ? 'مستلم' : 'معلق',
    ])),
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GOLD, f),
    ...baseTableStyles(f),
  });
};
