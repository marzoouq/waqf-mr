/**
 * مُصدِّرات صفحة الدخل — PDF/CSV (مفصول لتقليل حجم useIncomePage).
 */
import { useCallback } from 'react';
import { safeNumber } from '@/utils/format/safeNumber';
import { buildCsv, downloadCsv } from '@/utils/export/csv';
import { uiNotify } from '@/lib/notify';
import { logger } from '@/lib/logger';
import type { Income } from '@/types';
import type { usePdfWaqfInfo } from '@/hooks/data/settings/waqf/usePdfWaqfInfo';

type PdfWaqfInfo = ReturnType<typeof usePdfWaqfInfo>;

export function useIncomeExporters(
  filteredIncome: Income[],
  totalIncome: number,
  pdfWaqfInfo: PdfWaqfInfo,
) {
  const handleExportPdf = useCallback(async () => {
    try {
      const { generateIncomePDF } = await import('@/utils/pdf');
      await generateIncomePDF(filteredIncome, totalIncome, pdfWaqfInfo);
    } catch (e) {
      logger.error('PDF Income failed:', e);
      uiNotify.error('تعذّر توليد ملف PDF');
    }
  }, [filteredIncome, totalIncome, pdfWaqfInfo]);

  const handleExportCsv = useCallback(() => {
    const csv = buildCsv(filteredIncome.map(item => ({
      'المصدر': item.source,
      'المبلغ': safeNumber(item.amount),
      'التاريخ': item.date,
      'العقار': item.property?.property_number || '-',
      'ملاحظات': item.notes || '-',
    })));
    downloadCsv(csv, 'دخل.csv');
    uiNotify.success('تم تصدير الدخل بنجاح');
  }, [filteredIncome]);

  return { handleExportPdf, handleExportCsv };
}
