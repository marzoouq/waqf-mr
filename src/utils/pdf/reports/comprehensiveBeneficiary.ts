import type { jsPDF } from 'jspdf';
import {
  PdfWaqfInfo, createPdfDocument, finalizePdf,
  TABLE_HEAD_GREEN,
  baseTableStyles, headStyles,
  reshapeArabic as rs, reshapeRow,
} from '../core/core';
import { getPdfThemeColors } from '../core/themeColors';
import { fmt } from '@/utils/format/format';
import {
  renderContractsTable,
  renderIncomeTable,
  renderExpensesTable,
  renderFinancialSequenceTable,
  renderShareTable,
  renderDistributionsTable,
} from './comprehensiveBeneficiaryTables';

export interface ComprehensiveBeneficiaryData {
  beneficiaryName: string;
  fiscalYear: string;
  isFiscalYearActive?: boolean;
  totalIncome: number;
  totalExpenses: number;
  netAfterExpenses: number;
  vatAmount: number;
  netAfterVat: number;
  zakatAmount: number;
  netAfterZakat: number;
  adminShare: number;
  waqifShare: number;
  adminPct?: number;
  waqifPct?: number;
  waqfRevenue: number;
  waqfCorpusManual: number;
  availableAmount: number;
  myShare: number;
  totalReceived: number;
  pendingAmount: number;
  incomeBySource: Record<string, number>;
  expensesByType: Record<string, number>;
  contracts: Array<{
    contract_number: string;
    tenant_name: string;
    rent_amount: number;
    status: string;
  }>;
  distributions: Array<{
    date: string;
    fiscalYear: string;
    amount: number;
    status: string;
  }>;
}

export const generateComprehensiveBeneficiaryPDF = async (
  data: ComprehensiveBeneficiaryData,
  waqfInfo?: PdfWaqfInfo,
) => {
  const { default: autoTable } = await import('jspdf-autotable');
  const { doc, fontFamily: f, startY } = await createPdfDocument(waqfInfo);
  const themeColors = getPdfThemeColors();

  // ═══ Title ═══
  doc.setFont(f, 'bold');
  doc.setFontSize(20);
  doc.text(rs('التقرير المالي الشامل للمستفيد'), 105, startY + 5, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont(f, 'normal');
  doc.text(rs(`السنة المالية: ${data.fiscalYear}`), 105, startY + 16, { align: 'center' });
  doc.text(rs(`المستفيد: ${data.beneficiaryName}`), 105, startY + 24, { align: 'center' });

  // علامة تقديرية للسنة النشطة
  let disclaimerOffset = 0;
  if (data.isFiscalYearActive) {
    doc.setFontSize(9);
    doc.setTextColor(...themeColors.secondary);
    doc.text(rs('⚠ الأرقام تقديرية — السنة المالية لم تُقفل بعد'), 105, startY + 32, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    disclaimerOffset = 10;
  }

  // ═══ Section 1: My Share Summary ═══
  doc.setFont(f, 'bold');
  doc.setFontSize(14);
  doc.text(rs('أولاً: ملخص الحصة'), 192, startY + 36 + disclaimerOffset, { align: 'right' });

  autoTable(doc, {
    startY: startY + 42 + disclaimerOffset,
    head: [reshapeRow(['البيان', 'القيمة (ر.س)'])],
    body: [
      reshapeRow(['حصتي المستحقة', fmt(data.myShare)]),
      reshapeRow(['المبالغ المستلمة', fmt(data.totalReceived)]),
      reshapeRow(['المبالغ المعلقة', fmt(data.pendingAmount)]),
    ],
    theme: 'grid',
    ...headStyles(TABLE_HEAD_GREEN, f),
    ...baseTableStyles(f),
    columnStyles: { 0: { cellWidth: 100 } },
  });

  // ═══ Sections 2–7: جداول مستخرجة ═══
  renderContractsTable(doc, autoTable as (d: jsPDF, o: Parameters<typeof autoTable>[1]) => void, f, data, waqfInfo);
  renderIncomeTable(doc, autoTable as (d: jsPDF, o: Parameters<typeof autoTable>[1]) => void, f, data);
  renderExpensesTable(doc, autoTable as (d: jsPDF, o: Parameters<typeof autoTable>[1]) => void, f, data);
  renderFinancialSequenceTable(doc, autoTable as (d: jsPDF, o: Parameters<typeof autoTable>[1]) => void, f, data);
  renderShareTable(doc, autoTable as (d: jsPDF, o: Parameters<typeof autoTable>[1]) => void, f, data);
  renderDistributionsTable(doc, autoTable as (d: jsPDF, o: Parameters<typeof autoTable>[1]) => void, f, data);

  finalizePdf(doc, f, `تقرير-شامل-${data.beneficiaryName}-${data.fiscalYear}.pdf`, waqfInfo);
};
