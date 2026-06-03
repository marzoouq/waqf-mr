/**
 * تقرير سنوي مُجمَّع للناظر — يجمع البيانات المالية الكاملة + محتوى التقرير السنوي
 * مصدر البيانات: dashboard-summary RPC (نفس لوحة الناظر) لضمان تطابق الأرقام.
 */
import type jsPDF from 'jspdf';
import type { CellHookData } from 'jspdf-autotable';
import {
  createPdfDocument, finalizePdf,
  TABLE_HEAD_GREEN, baseTableStyles, headStyles,
  reshapeArabic as rs, reshapeRow,
  type PdfWaqfInfo,
} from '../core/core';
import { getLastAutoTableY } from '../core/pdfHelpers';
import { fmt } from '@/utils/format/format';
import { logger } from '@/lib/logger';

export interface AggregatedAnnualPdfData {
  fiscalYearLabel: string;
  gregorianRange?: string;
  isClosed: boolean;
  // ─── ماليات شاملة ───
  totalIncome: number;
  totalExpenses: number;
  netAfterExpenses: number;
  vatAmount: number;
  netAfterVat: number;
  zakatAmount: number;
  netAfterZakat: number;
  adminShare: number;
  adminPct: number;
  waqifShare: number;
  waqifPct: number;
  waqfRevenue: number;
  waqfCorpusManual: number;
  waqfCorpusPrevious: number;
  availableAmount: number;
  distributionsAmount: number;
  remainingBalance: number;
  // ─── جداول ───
  incomeBySource?: Record<string, number>;
  expensesByType?: Record<string, number>;
  beneficiaries: Array<{ name: string; share_percentage: number; computedShare: number }>;
  distributions: Array<{ date: string; beneficiary: string; amount: number; status: string }>;
  // ─── مقارنة YoY ───
  yoy?: {
    prevLabel: string;
    prevIncome: number;
    prevExpenses: number;
    prevNetAfterZakat: number;
  } | null;
  // ─── محتوى التقرير السنوي ───
  achievements: Array<{ title: string; content: string }>;
  challenges: Array<{ title: string; content: string }>;
  futurePlans: Array<{ title: string; content: string }>;
  propertyStatuses: Array<{ title: string; content: string; propertyName?: string }>;
  // عدّ موجز
  counts: {
    properties: number;
    activeContracts: number;
    beneficiaries: number;
    rentedUnits: number;
    totalUnits: number;
  };
}

const sectionTitle = (doc: jsPDF, f: string, title: string, y: number) => {
  doc.setFont(f, 'bold');
  doc.setFontSize(13);
  doc.text(rs(title), 192, y, { align: 'right' });
};

export const generateAggregatedAnnualReportPDF = async (
  data: AggregatedAnnualPdfData,
  waqfInfo?: PdfWaqfInfo,
): Promise<boolean> => {
  try {
    const { default: autoTable } = await import('jspdf-autotable');
    const { doc, fontFamily: f, startY } = await createPdfDocument(waqfInfo);

    // ─── العنوان ───
    doc.setFont(f, 'bold');
    doc.setFontSize(18);
    doc.text(rs('التقرير السنوي المُجمَّع'), 105, startY + 6, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont(f, 'normal');
    doc.text(rs(`السنة المالية: ${data.fiscalYearLabel}`), 105, startY + 16, { align: 'center' });
    if (data.gregorianRange) {
      doc.text(rs(data.gregorianRange), 105, startY + 23, { align: 'center' });
    }
    if (!data.isClosed) {
      doc.setFontSize(9);
      doc.setTextColor(180, 120, 20);
      doc.text(rs('⚠ الأرقام تقديرية — السنة المالية لم تُقفل بعد'), 105, startY + 31, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }

    let y = startY + (data.isClosed ? 32 : 38);

    // ─── البطاقات الموجزة ───
    sectionTitle(doc, f, 'أولاً: مؤشرات سريعة', y);
    autoTable(doc, {
      startY: y + 4,
      head: [reshapeRow(['البند', 'القيمة'])],
      body: [
        reshapeRow(['عدد العقارات', String(data.counts.properties)]),
        reshapeRow(['العقود النشطة', String(data.counts.activeContracts)]),
        reshapeRow(['عدد المستفيدين', String(data.counts.beneficiaries)]),
        reshapeRow(['الوحدات المؤجَّرة', `${data.counts.rentedUnits} / ${data.counts.totalUnits}`]),
      ],
      theme: 'grid',
      ...headStyles(TABLE_HEAD_GREEN, f),
      ...baseTableStyles(f),
    });
    y = getLastAutoTableY(doc) + 8;

    // ─── التسلسل المالي ───
    if (y > 230) { doc.addPage(); y = 25; }
    sectionTitle(doc, f, 'ثانياً: التسلسل المالي الكامل', y);
    const seqRows: (string | number)[][] = [
      ['إجمالي الدخل', `+${fmt(data.totalIncome)}`],
      ['(-) المصروفات التشغيلية', `(${fmt(data.totalExpenses)})`],
      ['الصافي بعد المصاريف', fmt(data.netAfterExpenses)],
      ['(-) ضريبة القيمة المضافة', `(${fmt(data.vatAmount)})`],
      ['الصافي بعد الضريبة', fmt(data.netAfterVat)],
    ];
    if (data.zakatAmount > 0) {
      seqRows.push(['(-) الزكاة', `(${fmt(data.zakatAmount)})`]);
      seqRows.push(['الصافي بعد الزكاة', fmt(data.netAfterZakat)]);
    }
    if (data.adminShare > 0) seqRows.push([`(-) حصة الناظر (${data.adminPct}%)`, `(${fmt(data.adminShare)})`]);
    if (data.waqifShare > 0) seqRows.push([`(-) حصة الواقف (${data.waqifPct}%)`, `(${fmt(data.waqifShare)})`]);
    seqRows.push(['ريع الوقف', fmt(data.waqfRevenue)]);
    if (data.waqfCorpusManual > 0) seqRows.push(['(-) رقبة الوقف للعام الحالي', `(${fmt(data.waqfCorpusManual)})`]);
    if (data.waqfCorpusPrevious > 0) seqRows.push(['(+) فائض رقبة الوقف المُرحَّل', `+${fmt(data.waqfCorpusPrevious)}`]);
    seqRows.push(['المتاح للتوزيع', fmt(data.availableAmount)]);
    if (data.distributionsAmount > 0) seqRows.push(['(-) التوزيعات المُنفَّذة', `(${fmt(data.distributionsAmount)})`]);
    seqRows.push(['الرصيد المتبقي', fmt(data.remainingBalance)]);

    autoTable(doc, {
      startY: y + 4,
      head: [reshapeRow(['البند', 'المبلغ (ر.س)'])],
      body: seqRows.map(r => reshapeRow(r)),
      theme: 'grid',
      ...headStyles(TABLE_HEAD_GREEN, f),
      ...baseTableStyles(f),
      didParseCell: (h: CellHookData) => {
        if (h.section === 'body' && h.row.index === seqRows.length - 1) {
          h.cell.styles.fontStyle = 'bold';
          h.cell.styles.fillColor = [235, 252, 235];
        }
      },
    });
    y = getLastAutoTableY(doc) + 8;

    // ─── الإيرادات حسب المصدر ───
    const incomeEntries = Object.entries(data.incomeBySource ?? {}).filter(([, v]) => v > 0);
    if (incomeEntries.length) {
      if (y > 240) { doc.addPage(); y = 25; }
      sectionTitle(doc, f, 'ثالثاً: الإيرادات حسب المصدر', y);
      autoTable(doc, {
        startY: y + 4,
        head: [reshapeRow(['المصدر', 'المبلغ (ر.س)'])],
        body: incomeEntries.map(([k, v]) => reshapeRow([k, fmt(v)])),
        theme: 'grid', ...headStyles(TABLE_HEAD_GREEN, f), ...baseTableStyles(f),
      });
      y = getLastAutoTableY(doc) + 8;
    }

    // ─── المصروفات حسب النوع ───
    const expensesEntries = Object.entries(data.expensesByType ?? {}).filter(([, v]) => v > 0);
    if (expensesEntries.length) {
      if (y > 240) { doc.addPage(); y = 25; }
      sectionTitle(doc, f, 'رابعاً: المصروفات حسب النوع (بدون VAT)', y);
      autoTable(doc, {
        startY: y + 4,
        head: [reshapeRow(['النوع', 'المبلغ (ر.س)'])],
        body: expensesEntries.map(([k, v]) => reshapeRow([k, fmt(v)])),
        theme: 'grid', ...headStyles(TABLE_HEAD_GREEN, f), ...baseTableStyles(f),
      });
      y = getLastAutoTableY(doc) + 8;
    }

    // ─── المستفيدون ───
    if (data.beneficiaries.length) {
      if (y > 230) { doc.addPage(); y = 25; }
      sectionTitle(doc, f, 'خامساً: المستفيدون والأنصبة', y);
      autoTable(doc, {
        startY: y + 4,
        head: [reshapeRow(['المستفيد', 'النسبة %', 'الحصة المحسوبة'])],
        body: data.beneficiaries.map(b =>
          reshapeRow([b.name, `${b.share_percentage}%`, fmt(b.computedShare)]),
        ),
        theme: 'grid', ...headStyles(TABLE_HEAD_GREEN, f), ...baseTableStyles(f),
      });
      y = getLastAutoTableY(doc) + 8;
    }

    // ─── التوزيعات المنفذة ───
    if (data.distributions.length) {
      if (y > 230) { doc.addPage(); y = 25; }
      sectionTitle(doc, f, 'سادساً: التوزيعات المنفَّذة', y);
      autoTable(doc, {
        startY: y + 4,
        head: [reshapeRow(['التاريخ', 'المستفيد', 'المبلغ', 'الحالة'])],
        body: data.distributions.map(d =>
          reshapeRow([d.date, d.beneficiary, fmt(d.amount), d.status === 'paid' ? 'مدفوع' : d.status]),
        ),
        theme: 'grid', ...headStyles(TABLE_HEAD_GREEN, f), ...baseTableStyles(f),
      });
      y = getLastAutoTableY(doc) + 8;
    }

    // ─── YoY ───
    if (data.yoy) {
      if (y > 240) { doc.addPage(); y = 25; }
      sectionTitle(doc, f, `سابعاً: مقارنة مع السنة السابقة (${data.yoy.prevLabel})`, y);
      autoTable(doc, {
        startY: y + 4,
        head: [reshapeRow(['البند', 'السنة السابقة', 'السنة الحالية', 'الفرق'])],
        body: [
          reshapeRow(['إجمالي الدخل', fmt(data.yoy.prevIncome), fmt(data.totalIncome), fmt(data.totalIncome - data.yoy.prevIncome)]),
          reshapeRow(['إجمالي المصروفات', fmt(data.yoy.prevExpenses), fmt(data.totalExpenses), fmt(data.totalExpenses - data.yoy.prevExpenses)]),
          reshapeRow(['الصافي بعد الزكاة', fmt(data.yoy.prevNetAfterZakat), fmt(data.netAfterZakat), fmt(data.netAfterZakat - data.yoy.prevNetAfterZakat)]),
        ],
        theme: 'grid', ...headStyles(TABLE_HEAD_GREEN, f), ...baseTableStyles(f),
      });
      y = getLastAutoTableY(doc) + 8;
    }

    // ─── محتوى التقرير السنوي (نصّي) ───
    const writeNarrative = (
      title: string,
      items: Array<{ title: string; content: string; propertyName?: string }>,
      color: [number, number, number],
    ) => {
      if (!items.length) return;
      if (y > 250) { doc.addPage(); y = 25; }
      doc.setFont(f, 'bold'); doc.setFontSize(13);
      doc.setTextColor(...color);
      doc.text(rs(title), 192, y, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      y += 7;
      items.forEach((item, idx) => {
        if (y > 265) { doc.addPage(); y = 25; }
        doc.setFont(f, 'bold'); doc.setFontSize(11);
        const prefix = item.propertyName ? `${item.propertyName}: ` : '';
        doc.text(rs(`${idx + 1}. ${prefix}${item.title}`), 192, y, { align: 'right' });
        y += 6;
        if (item.content) {
          doc.setFont(f, 'normal'); doc.setFontSize(10);
          const lines = doc.splitTextToSize(item.content, 174);
          lines.forEach((line: string) => {
            if (y > 270) { doc.addPage(); y = 25; }
            doc.text(rs(line), 192, y, { align: 'right' });
            y += 5;
          });
        }
        y += 3;
      });
      y += 4;
    };

    writeNarrative('ثامناً: حالة العقارات', data.propertyStatuses, [71, 85, 105]);
    writeNarrative('تاسعاً: الإنجازات', data.achievements, [22, 101, 52]);
    writeNarrative('عاشراً: التحديات', data.challenges, [180, 120, 20]);
    writeNarrative('حادي عشر: الخطط المستقبلية', data.futurePlans, [37, 99, 235]);

    finalizePdf(doc, f, `التقرير_السنوي_المُجمَّع_${data.fiscalYearLabel}.pdf`, waqfInfo);
    return true;
  } catch (e) {
    logger.error('aggregated-annual-report', { error: e });
    return false;
  }
};
