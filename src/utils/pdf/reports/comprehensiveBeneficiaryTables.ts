/**
 * دوال بناء جداول التقرير الشامل للمستفيد — مستخرجة لتقليل حجم الملف الرئيسي
 */
import type { jsPDF } from 'jspdf';
import type { CellHookData } from 'jspdf-autotable';
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

type AutoTableFn = (doc: jsPDF, options: UserOptions) => void;

const ensureSpace = (doc: jsPDF, needed: number): number => {
  const pageH = doc.internal.pageSize.height;
  const currentY = getLastAutoTableY(doc) + 10;
  if (currentY + needed > pageH - 30) {
    doc.addPage();
    return 25;
  }
  return currentY;
};

/** القسم الثاني: العقود */
export const renderContractsTable = (
  doc: jsPDF, autoTable: AutoTableFn, f: string, data: ComprehensiveBeneficiaryData, _waqfInfo?: PdfWaqfInfo,
) => {
  const y = ensureSpace(doc, 40);
  doc.setFont(f, 'bold');
  doc.setFontSize(14);
  doc.text(rs('ثانياً: العقود'), 192, y, { align: 'right' });

  if (data.contracts.length > 0) {
    autoTable(doc, {
      startY: y + 6,
      head: [reshapeRow(['رقم العقد', 'المستأجر', 'الإيجار السنوي', 'الإيجار الشهري', 'الحالة'])],
      body: data.contracts.map(c => reshapeRow([
        c.contract_number,
        c.tenant_name,
        fmt(Number(c.rent_amount)),
        fmtInt(Math.round(Number(c.rent_amount) / 12)),
        c.status === 'active' ? 'نشط' : c.status === 'expired' ? 'منتهي' : c.status,
      ])),
      foot: [reshapeRow([
        'الإجمالي', '',
        fmt(data.contracts.reduce((s, c) => s + Number(c.rent_amount), 0)),
        fmtInt(Math.round(data.contracts.reduce((s, c) => s + Number(c.rent_amount), 0) / 12)),
        '',
      ])],
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
    foot: [reshapeRow(['إجمالي المصروفات', `-${fmt(data.totalExpenses)}`])],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_RED, f),
    ...footStyles(TABLE_HEAD_RED, f),
    ...baseTableStyles(f),
  });
};

/** القسم الخامس: التسلسل المالي */
export const renderFinancialSequenceTable = (
  doc: jsPDF, autoTable: AutoTableFn, f: string, data: ComprehensiveBeneficiaryData,
) => {
  const y = ensureSpace(doc, 80);
  doc.setFont(f, 'bold');
  doc.setFontSize(14);
  doc.text(rs('خامساً: التسلسل المالي والحسابات الختامية'), 192, y, { align: 'right' });

  const sequenceRows: (string | number)[][] = [
    ['إجمالي الدخل', `+${fmt(data.totalIncome)}`],
    ['(-) المصروفات التشغيلية', `(${fmt(data.totalExpenses)})`],
    ['الصافي بعد المصاريف', fmt(data.netAfterExpenses)],
    ['(-) ضريبة القيمة المضافة', `(${fmt(data.vatAmount)})`],
    ['الصافي بعد الضريبة', fmt(data.netAfterVat)],
  ];

  if (data.zakatAmount > 0) {
    sequenceRows.push(
      ['(-) الزكاة', `(${fmt(data.zakatAmount)})`],
      ['الصافي بعد الزكاة', fmt(data.netAfterZakat)],
    );
  }
  if (data.adminShare > 0) {
    sequenceRows.push([`(-) حصة الناظر (${data.adminPct ?? 10}%)`, `(${fmt(data.adminShare)})`]);
  }
  if (data.waqifShare > 0) {
    sequenceRows.push([`(-) حصة الواقف (${data.waqifPct ?? 5}%)`, `(${fmt(data.waqifShare)})`]);
  }
  if (data.waqfCorpusManual > 0) {
    sequenceRows.push(['(-) رقبة الوقف للعام الحالي', `(${fmt(data.waqfCorpusManual)})`]);
  }
  sequenceRows.push(['الإجمالي القابل للتوزيع', fmt(data.availableAmount)]);

  autoTable(doc, {
    startY: y + 6,
    head: [reshapeRow(['البند', 'المبلغ (ر.س)'])],
    body: sequenceRows.map(r => reshapeRow(r)),
    theme: 'grid',
    ...headStyles(TABLE_HEAD_GOLD, f),
    ...baseTableStyles(f),
    didParseCell: (hookData: CellHookData) => {
      if (hookData.section === 'body' && hookData.row.index === sequenceRows.length - 1) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [235, 252, 235];
      }
    },
  });
};

/** القسم السادس: حصتي من الريع */
export const renderShareTable = (
  doc: jsPDF, autoTable: AutoTableFn, f: string, data: ComprehensiveBeneficiaryData,
) => {
  const y = ensureSpace(doc, 30);
  doc.setFont(f, 'bold');
  doc.setFontSize(14);
  doc.text(rs('سادساً: حصتي من الريع'), 192, y, { align: 'right' });

  autoTable(doc, {
    startY: y + 6,
    head: [reshapeRow(['البيان', 'القيمة (ر.س)'])],
    body: [
      reshapeRow(['إجمالي ريع الوقف القابل للتوزيع', fmt(data.availableAmount)]),
      reshapeRow(['حصتي المستحقة', fmt(data.myShare)]),
      reshapeRow(['المبالغ المستلمة', fmt(data.totalReceived)]),
      reshapeRow(['المبالغ المعلقة', fmt(data.pendingAmount)]),
    ],
    theme: 'grid',
    ...headStyles(TABLE_HEAD_GREEN, f),
    ...baseTableStyles(f),
    didParseCell: (hookData: CellHookData) => {
      if (hookData.section === 'body' && hookData.row.index === 1) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [235, 252, 235];
      }
    },
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
