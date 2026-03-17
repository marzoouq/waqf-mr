import jsPDF from 'jspdf';
import autoTable, { type CellHookData } from 'jspdf-autotable';
import {
  PdfWaqfInfo, loadArabicFont, addHeader, addHeaderToAllPages, addFooter,
  TABLE_HEAD_GREEN, TABLE_HEAD_GOLD, TABLE_HEAD_RED,
  baseTableStyles, headStyles, footStyles,
  reshapeArabic as rs, reshapeRow,
} from './core';
import { getLastAutoTableY } from './pdfHelpers';

export interface ComprehensiveBeneficiaryData {
  beneficiaryName: string;
  fiscalYear: string;
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

const ensureSpace = (doc: jsPDF, needed: number, _fontFamily: string, _waqfInfo?: PdfWaqfInfo): number => {
  const pageH = doc.internal.pageSize.height;
  const currentY = getLastAutoTableY(doc) + 10;
  if (currentY + needed > pageH - 30) {
    doc.addPage();
    return 25;
  }
  return currentY;
};

export const generateComprehensiveBeneficiaryPDF = async (
  data: ComprehensiveBeneficiaryData,
  waqfInfo?: PdfWaqfInfo,
) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const f = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, f, waqfInfo);

  // ═══ Title ═══
  doc.setFont(f, 'bold');
  doc.setFontSize(20);
  doc.text(rs('التقرير المالي الشامل للمستفيد'), 105, startY + 5, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont(f, 'normal');
  doc.text(rs(`السنة المالية: ${data.fiscalYear}`), 105, startY + 16, { align: 'center' });
  doc.text(rs(`المستفيد: ${data.beneficiaryName}`), 105, startY + 24, { align: 'center' });

  // ═══ Section 1: My Share Summary ═══
  doc.setFont(f, 'bold');
  doc.setFontSize(14);
  doc.text(rs('أولاً: ملخص الحصة'), 192, startY + 36, { align: 'right' });

  autoTable(doc, {
    startY: startY + 42,
    head: [reshapeRow(['البيان', 'القيمة (ر.س)'])],
    body: [
      reshapeRow(['حصتي المستحقة', data.myShare.toLocaleString()]),
      reshapeRow(['المبالغ المستلمة', data.totalReceived.toLocaleString()]),
      reshapeRow(['المبالغ المعلقة', data.pendingAmount.toLocaleString()]),
    ],
    theme: 'grid',
    ...headStyles(TABLE_HEAD_GREEN, f),
    ...baseTableStyles(f),
    columnStyles: { 0: { cellWidth: 100 } },
  });

  // ═══ Section 2: Contracts ═══
  let y = ensureSpace(doc, 40, f, waqfInfo);
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
        Number(c.rent_amount).toLocaleString(),
        Math.round(Number(c.rent_amount) / 12).toLocaleString(),
        c.status === 'active' ? 'نشط' : c.status === 'expired' ? 'منتهي' : c.status,
      ])),
      foot: [reshapeRow([
        'الإجمالي', '',
        data.contracts.reduce((s, c) => s + Number(c.rent_amount), 0).toLocaleString(),
        Math.round(data.contracts.reduce((s, c) => s + Number(c.rent_amount), 0) / 12).toLocaleString(),
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

  // ═══ Section 3: Income Breakdown ═══
  y = ensureSpace(doc, 40, f, waqfInfo);
  doc.setFont(f, 'bold');
  doc.setFontSize(14);
  doc.text(rs('ثالثاً: الإيرادات'), 192, y, { align: 'right' });

  autoTable(doc, {
    startY: y + 6,
    head: [reshapeRow(['المصدر', 'المبلغ (ر.س)'])],
    body: Object.entries(data.incomeBySource).map(([s, a]) => reshapeRow([s, `+${a.toLocaleString()}`])),
    foot: [reshapeRow(['إجمالي الإيرادات', `+${data.totalIncome.toLocaleString()}`])],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, f),
    ...footStyles(TABLE_HEAD_GREEN, f),
    ...baseTableStyles(f),
  });

  // ═══ Section 4: Expenses Breakdown ═══
  y = ensureSpace(doc, 40, f, waqfInfo);
  doc.setFont(f, 'bold');
  doc.setFontSize(14);
  doc.text(rs('رابعاً: المصروفات'), 192, y, { align: 'right' });

  autoTable(doc, {
    startY: y + 6,
    head: [reshapeRow(['النوع', 'المبلغ (ر.س)'])],
    body: Object.entries(data.expensesByType).map(([t, a]) => reshapeRow([t, `-${a.toLocaleString()}`])),
    foot: [reshapeRow(['إجمالي المصروفات', `-${data.totalExpenses.toLocaleString()}`])],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_RED, f),
    ...footStyles(TABLE_HEAD_RED, f),
    ...baseTableStyles(f),
  });

  // ═══ Section 5: Full Financial Sequence (Accounts) ═══
  y = ensureSpace(doc, 80, f, waqfInfo);
  doc.setFont(f, 'bold');
  doc.setFontSize(14);
  doc.text(rs('خامساً: التسلسل المالي والحسابات الختامية'), 192, y, { align: 'right' });

  const sequenceRows: (string | number)[][] = [
    ['إجمالي الدخل', `+${data.totalIncome.toLocaleString()}`],
    ['(-) المصروفات التشغيلية', `(${data.totalExpenses.toLocaleString()})`],
    ['الصافي بعد المصاريف', data.netAfterExpenses.toLocaleString()],
    ['(-) ضريبة القيمة المضافة', `(${data.vatAmount.toLocaleString()})`],
    ['الصافي بعد الضريبة', data.netAfterVat.toLocaleString()],
  ];

  if (data.zakatAmount > 0) {
    sequenceRows.push(
      ['(-) الزكاة', `(${data.zakatAmount.toLocaleString()})`],
      ['الصافي بعد الزكاة', data.netAfterZakat.toLocaleString()],
    );
  }

  if (data.adminShare > 0) {
    sequenceRows.push(
      [`(-) حصة الناظر (${data.adminPct ?? 10}%)`, `(${data.adminShare.toLocaleString()})`],
    );
  }
  if (data.waqifShare > 0) {
    sequenceRows.push(
      [`(-) حصة الواقف (${data.waqifPct ?? 5}%)`, `(${data.waqifShare.toLocaleString()})`],
    );
  }
  if (data.waqfCorpusManual > 0) {
    sequenceRows.push(
      ['(-) رقبة الوقف للعام الحالي', `(${data.waqfCorpusManual.toLocaleString()})`],
    );
  }

  sequenceRows.push(
    ['الإجمالي القابل للتوزيع', data.availableAmount.toLocaleString()],
  );

  autoTable(doc, {
    startY: y + 6,
    head: [reshapeRow(['البند', 'المبلغ (ر.س)'])],
    body: sequenceRows.map(r => reshapeRow(r)),
    theme: 'grid',
    ...headStyles(TABLE_HEAD_GOLD, f),
    ...baseTableStyles(f),
    didParseCell: (hookData: CellHookData) => {
      if (hookData.section === 'body') {
        const lastIdx = sequenceRows.length - 1;
        if (hookData.row.index === lastIdx) {
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fillColor = [235, 252, 235];
        }
      }
    },
  });

  // ═══ Section 6: My Entitled Share ═══
  y = ensureSpace(doc, 30, f, waqfInfo);
  doc.setFont(f, 'bold');
  doc.setFontSize(14);
  doc.text(rs('سادساً: حصتي من الريع'), 192, y, { align: 'right' });

  autoTable(doc, {
    startY: y + 6,
    head: [reshapeRow(['البيان', 'القيمة (ر.س)'])],
    body: [
      reshapeRow(['إجمالي ريع الوقف القابل للتوزيع', data.availableAmount.toLocaleString()]),
      reshapeRow(['حصتي المستحقة', data.myShare.toLocaleString()]),
      reshapeRow(['المبالغ المستلمة', data.totalReceived.toLocaleString()]),
      reshapeRow(['المبالغ المعلقة', data.pendingAmount.toLocaleString()]),
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

  // ═══ Section 7: Distribution History ═══
  if (data.distributions.length > 0) {
    y = ensureSpace(doc, 30, f, waqfInfo);
    doc.setFont(f, 'bold');
    doc.setFontSize(14);
    doc.text(rs('سابعاً: سجل التوزيعات'), 192, y, { align: 'right' });

    autoTable(doc, {
      startY: y + 6,
      head: [reshapeRow(['التاريخ', 'السنة المالية', 'المبلغ (ر.س)', 'الحالة'])],
      body: data.distributions.map(d => reshapeRow([
        d.date,
        d.fiscalYear,
        d.amount.toLocaleString(),
        d.status === 'paid' ? 'مستلم' : 'معلق',
      ])),
      theme: 'striped',
      ...headStyles(TABLE_HEAD_GOLD, f),
      ...baseTableStyles(f),
    });
  }

  addHeaderToAllPages(doc, f, waqfInfo);
  addFooter(doc, f, waqfInfo);
  doc.save(`تقرير-شامل-${data.beneficiaryName}-${data.fiscalYear}.pdf`);
};
