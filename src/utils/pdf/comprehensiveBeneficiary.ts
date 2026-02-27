import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PdfWaqfInfo, loadArabicFont, addHeader, addHeaderToAllPages, addFooter,
  TABLE_HEAD_GREEN, TABLE_HEAD_GOLD, TABLE_HEAD_RED,
  baseTableStyles, headStyles, footStyles,
} from './core';

export interface ComprehensiveBeneficiaryData {
  beneficiaryName: string;
  fiscalYear: string;
  // Accounts summary
  totalIncome: number;
  totalExpenses: number;
  netAfterExpenses: number;
  vatAmount: number;
  netAfterVat: number;
  zakatAmount: number;
  netAfterZakat: number;
  adminShare: number;
  waqifShare: number;
  waqfRevenue: number;
  waqfCorpusManual: number;
  availableAmount: number;
  // My share
  myShare: number;
  totalReceived: number;
  pendingAmount: number;
  // Breakdowns
  incomeBySource: Record<string, number>;
  expensesByType: Record<string, number>;
  // Contracts
  contracts: Array<{
    contract_number: string;
    tenant_name: string;
    rent_amount: number;
    status: string;
  }>;
  // Distributions
  distributions: Array<{
    date: string;
    fiscalYear: string;
    amount: number;
    status: string;
  }>;
}

const getLastAutoTableY = (doc: jsPDF): number =>
  ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 90);

const ensureSpace = (doc: jsPDF, needed: number, fontFamily: string, waqfInfo?: PdfWaqfInfo): number => {
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
  doc.text('التقرير المالي الشامل للمستفيد', 105, startY + 5, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont(f, 'normal');
  doc.text(`السنة المالية: ${data.fiscalYear}`, 105, startY + 16, { align: 'center' });
  doc.text(`المستفيد: ${data.beneficiaryName}`, 105, startY + 24, { align: 'center' });

  // ═══ Section 1: My Share Summary ═══
  doc.setFont(f, 'bold');
  doc.setFontSize(14);
  doc.text('أولاً: ملخص الحصة', 192, startY + 36, { align: 'right' });

  autoTable(doc, {
    startY: startY + 42,
    head: [['البيان', 'القيمة (ر.س)']],
    body: [
      ['حصتي المستحقة', data.myShare.toLocaleString()],
      ['المبالغ المستلمة', data.totalReceived.toLocaleString()],
      ['المبالغ المعلقة', data.pendingAmount.toLocaleString()],
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
  doc.text('ثانياً: العقود', 192, y, { align: 'right' });

  if (data.contracts.length > 0) {
    autoTable(doc, {
      startY: y + 6,
      head: [['رقم العقد', 'المستأجر', 'الإيجار السنوي', 'الإيجار الشهري', 'الحالة']],
      body: data.contracts.map(c => [
        c.contract_number,
        c.tenant_name,
        Number(c.rent_amount).toLocaleString(),
        Math.round(Number(c.rent_amount) / 12).toLocaleString(),
        c.status === 'active' ? 'نشط' : c.status === 'expired' ? 'منتهي' : c.status,
      ]),
      foot: [[
        'الإجمالي', '',
        data.contracts.reduce((s, c) => s + Number(c.rent_amount), 0).toLocaleString(),
        Math.round(data.contracts.reduce((s, c) => s + Number(c.rent_amount), 0) / 12).toLocaleString(),
        '',
      ]],
      theme: 'striped',
      ...headStyles(TABLE_HEAD_GREEN, f),
      ...footStyles(TABLE_HEAD_GREEN, f),
      ...baseTableStyles(f),
    });
  } else {
    doc.setFont(f, 'normal');
    doc.setFontSize(10);
    doc.text('لا توجد عقود مسجلة', 105, y + 10, { align: 'center' });
  }

  // ═══ Section 3: Income Breakdown ═══
  y = ensureSpace(doc, 40, f, waqfInfo);
  doc.setFont(f, 'bold');
  doc.setFontSize(14);
  doc.text('ثالثاً: الإيرادات', 192, y, { align: 'right' });

  autoTable(doc, {
    startY: y + 6,
    head: [['المصدر', 'المبلغ (ر.س)']],
    body: Object.entries(data.incomeBySource).map(([s, a]) => [s, `+${a.toLocaleString()}`]),
    foot: [['إجمالي الإيرادات', `+${data.totalIncome.toLocaleString()}`]],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, f),
    ...footStyles(TABLE_HEAD_GREEN, f),
    ...baseTableStyles(f),
  });

  // ═══ Section 4: Expenses Breakdown ═══
  y = ensureSpace(doc, 40, f, waqfInfo);
  doc.setFont(f, 'bold');
  doc.setFontSize(14);
  doc.text('رابعاً: المصروفات', 192, y, { align: 'right' });

  autoTable(doc, {
    startY: y + 6,
    head: [['النوع', 'المبلغ (ر.س)']],
    body: Object.entries(data.expensesByType).map(([t, a]) => [t, `-${a.toLocaleString()}`]),
    foot: [['إجمالي المصروفات', `-${data.totalExpenses.toLocaleString()}`]],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_RED, f),
    ...footStyles(TABLE_HEAD_RED, f),
    ...baseTableStyles(f),
  });

  // ═══ Section 5: Full Financial Sequence (Accounts) ═══
  y = ensureSpace(doc, 80, f, waqfInfo);
  doc.setFont(f, 'bold');
  doc.setFontSize(14);
  doc.text('خامساً: التسلسل المالي والحسابات الختامية', 192, y, { align: 'right' });

  const sequenceRows = [
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

  sequenceRows.push(
    ['(-) حصة الناظر', `(${data.adminShare.toLocaleString()})`],
    ['(-) حصة الواقف', `(${data.waqifShare.toLocaleString()})`],
    ['ريع الوقف', data.waqfRevenue.toLocaleString()],
  );

  if (data.waqfCorpusManual > 0) {
    sequenceRows.push(
      ['(-) رقبة الوقف', `(${data.waqfCorpusManual.toLocaleString()})`],
    );
  }

  sequenceRows.push(
    ['الإجمالي القابل للتوزيع', data.availableAmount.toLocaleString()],
  );

  autoTable(doc, {
    startY: y + 6,
    head: [['البند', 'المبلغ (ر.س)']],
    body: sequenceRows,
    theme: 'grid',
    ...headStyles(TABLE_HEAD_GOLD, f),
    ...baseTableStyles(f),
    didParseCell: (hookData: any) => {
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
  doc.text('سادساً: حصتي من الريع', 192, y, { align: 'right' });

  autoTable(doc, {
    startY: y + 6,
    head: [['البيان', 'القيمة (ر.س)']],
    body: [
      ['إجمالي ريع الوقف القابل للتوزيع', data.availableAmount.toLocaleString()],
      ['حصتي المستحقة', data.myShare.toLocaleString()],
      ['المبالغ المستلمة', data.totalReceived.toLocaleString()],
      ['المبالغ المعلقة', data.pendingAmount.toLocaleString()],
    ],
    theme: 'grid',
    ...headStyles(TABLE_HEAD_GREEN, f),
    ...baseTableStyles(f),
    didParseCell: (hookData: any) => {
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
    doc.text('سابعاً: سجل التوزيعات', 192, y, { align: 'right' });

    autoTable(doc, {
      startY: y + 6,
      head: [['التاريخ', 'السنة المالية', 'المبلغ (ر.س)', 'الحالة']],
      body: data.distributions.map(d => [
        d.date,
        d.fiscalYear,
        d.amount.toLocaleString(),
        d.status === 'paid' ? 'مستلم' : 'معلق',
      ]),
      theme: 'striped',
      ...headStyles(TABLE_HEAD_GOLD, f),
      ...baseTableStyles(f),
    });
  }

  addHeaderToAllPages(doc, f, waqfInfo);
  addFooter(doc, f, waqfInfo);
  doc.save(`تقرير-شامل-${data.beneficiaryName}-${data.fiscalYear}.pdf`);
};
