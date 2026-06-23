/**
 * تقرير سنوي مُجمَّع للناظر — orchestrator
 * تم تقسيمه إلى: types.ts, sections.ts للالتزام بحدّ ≤200 سطر/ملف.
 */
import {
  createPdfDocument, finalizePdf,
  reshapeArabic as rs,
  type PdfWaqfInfo,
} from '../../core/core';
import { logger } from '@/lib/logger';
import type { AggregatedAnnualPdfData } from './types';
import {
  renderQuickIndicators, renderFinancialSequence, renderKeyValueTable,
  renderBeneficiaries, renderDistributions, renderYoY, writeNarrative,
} from './sections';

export type { AggregatedAnnualPdfData } from './types';

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

    y = renderQuickIndicators(doc, autoTable, f, data, y);

    if (y > 230) { doc.addPage(); y = 25; }
    y = renderFinancialSequence(doc, autoTable, f, data, y);

    const incomeEntries = Object.entries(data.incomeBySource ?? {}).filter(([, v]) => v > 0) as [string, number][];
    if (incomeEntries.length) {
      if (y > 240) { doc.addPage(); y = 25; }
      y = renderKeyValueTable(doc, autoTable, f, 'ثالثاً: الإيرادات حسب المصدر', ['المصدر', 'المبلغ (ر.س)'], incomeEntries, y);
    }

    const expensesEntries = Object.entries(data.expensesByType ?? {}).filter(([, v]) => v > 0) as [string, number][];
    if (expensesEntries.length) {
      if (y > 240) { doc.addPage(); y = 25; }
      y = renderKeyValueTable(doc, autoTable, f, 'رابعاً: المصروفات حسب النوع (بدون VAT)', ['النوع', 'المبلغ (ر.س)'], expensesEntries, y);
    }

    if (data.beneficiaries.length) {
      if (y > 230) { doc.addPage(); y = 25; }
      y = renderBeneficiaries(doc, autoTable, f, data, y);
    }

    if (data.distributions.length) {
      if (y > 230) { doc.addPage(); y = 25; }
      y = renderDistributions(doc, autoTable, f, data, y);
    }

    if (data.yoy) {
      if (y > 240) { doc.addPage(); y = 25; }
      y = renderYoY(doc, autoTable, f, data, y);
    }

    y = writeNarrative(doc, f, 'ثامناً: حالة العقارات', data.propertyStatuses, [71, 85, 105], y);
    y = writeNarrative(doc, f, 'تاسعاً: الإنجازات', data.achievements, [22, 101, 52], y);
    y = writeNarrative(doc, f, 'عاشراً: التحديات', data.challenges, [180, 120, 20], y);
    y = writeNarrative(doc, f, 'حادي عشر: الخطط المستقبلية', data.futurePlans, [37, 99, 235], y);

    finalizePdf(doc, f, `التقرير_السنوي_المُجمَّع_${data.fiscalYearLabel}.pdf`, waqfInfo);
    return true;
  } catch (e) {
    logger.error('aggregated-annual-report', { error: e });
    return false;
  }
};
