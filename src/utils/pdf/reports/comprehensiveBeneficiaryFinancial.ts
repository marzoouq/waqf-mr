/**
 * أقسام التسلسل المالي وحصتي من الريع — مستخرجة من comprehensiveBeneficiaryTables.ts
 */
import type { jsPDF } from 'jspdf';
import type { CellHookData, UserOptions } from 'jspdf-autotable';
import {
  TABLE_HEAD_GREEN, TABLE_HEAD_GOLD,
  baseTableStyles, headStyles,
  reshapeArabic as rs, reshapeRow,
} from '../core/core';
import { getLastAutoTableY } from '../core/pdfHelpers';
import { fmt } from '@/utils/format/format';
import type { ComprehensiveBeneficiaryData } from './comprehensiveBeneficiary';

type AutoTableFn = (doc: jsPDF, options: UserOptions) => void;

function ensureSpace(doc: jsPDF, needed: number): number {
  const pageH = doc.internal.pageSize.height;
  const currentY = getLastAutoTableY(doc) + 10;
  if (currentY + needed > pageH - 30) {
    doc.addPage();
    return 25;
  }
  return currentY;
}

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
