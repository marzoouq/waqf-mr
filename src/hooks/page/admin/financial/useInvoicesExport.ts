/**
 * هوك تصدير الفواتير + actions PDF/CSV/Template — مُستخرج من useInvoicesPage
 *
 * مسؤوليات: handleExportPdf, handleExportCsv, handleSaveTemplate, handleGeneratePdfForMissing
 */
import { useCallback } from 'react';
import { defaultNotify } from '@/lib/notify';
import { safeNumber } from '@/utils/format/safeNumber';
import { buildCsv, downloadCsv } from '@/utils/export/csv';
import { asMutationArg } from '@/hooks/data/core';
import {
  INVOICE_TYPE_LABELS,
  INVOICE_STATUS_LABELS,
  type Invoice,
  useCreateInvoice,
  useGenerateInvoicePdf,
} from '@/hooks/data/invoices/useInvoices';
import type { PdfWaqfInfo } from '@/utils/pdf/core/core';

interface UseInvoicesExportArgs {
  filteredInvoices: Invoice[];
  invoicesWithoutFiles: Invoice[];
  fiscalYearId: string | null | undefined;
  fiscalYearLabel: string | undefined;
  pdfWaqfInfo: PdfWaqfInfo;
  createInvoice: ReturnType<typeof useCreateInvoice>;
  generatePdf: ReturnType<typeof useGenerateInvoicePdf>;
  setTemplateOpen: (open: boolean) => void;
}

export const useInvoicesExport = ({
  filteredInvoices,
  invoicesWithoutFiles,
  fiscalYearId,
  fiscalYearLabel,
  pdfWaqfInfo,
  createInvoice,
  generatePdf,
  setTemplateOpen,
}: UseInvoicesExportArgs) => {
  const handleExportPdf = useCallback(async () => {
    if (!fiscalYearId || fiscalYearId === 'all') {
      defaultNotify.warning('⚠️ أنت تصدّر فواتير جميع السنوات المالية.');
    }
    try {
      const fyLabel = fiscalYearLabel || (fiscalYearId ? '' : 'جميع السنوات');
      const { generateInvoicesViewPDF } = await import('@/utils/pdf');
      await generateInvoicesViewPDF(
        filteredInvoices.map((inv) => ({
          invoice_type: INVOICE_TYPE_LABELS[inv.invoice_type] || inv.invoice_type,
          invoice_number: inv.invoice_number,
          amount: safeNumber(inv.amount),
          date: inv.date,
          property_number: inv.property?.property_number || '-',
          status: inv.status,
        })),
        pdfWaqfInfo,
        fyLabel,
      );
      defaultNotify.success('تم تحميل ملف PDF بنجاح');
    } catch {
      defaultNotify.error('حدث خطأ أثناء تصدير PDF');
    }
  }, [fiscalYearId, fiscalYearLabel, filteredInvoices, pdfWaqfInfo]);

  const handleExportCsv = useCallback(() => {
    const fyLabel = fiscalYearLabel || 'جميع-السنوات';
    const csv = buildCsv(
      filteredInvoices.map((inv) => ({
        'النوع': INVOICE_TYPE_LABELS[inv.invoice_type] || inv.invoice_type,
        'رقم الفاتورة': inv.invoice_number || '-',
        'المبلغ': safeNumber(inv.amount),
        'التاريخ': inv.date,
        'العقار': inv.property?.property_number || '-',
        'الحالة': INVOICE_STATUS_LABELS[inv.status] || inv.status,
      })),
    );
    downloadCsv(csv, `فواتير-${fyLabel}.csv`);
    defaultNotify.success('تم تصدير الفواتير بنجاح');
  }, [fiscalYearLabel, filteredInvoices]);

  const handleSaveTemplate = useCallback(
    async (data: Record<string, unknown>) => {
      type CreateArg = Parameters<typeof createInvoice.mutateAsync>[0];
      await createInvoice.mutateAsync(
        asMutationArg(createInvoice, {
          ...data,
          fiscal_year_id: fiscalYearId,
        } as unknown as CreateArg),
      );
      setTemplateOpen(false);
      defaultNotify.success('تم إنشاء الفاتورة بنجاح');
    },
    [createInvoice, fiscalYearId, setTemplateOpen],
  );

  const handleGeneratePdfForMissing = useCallback(() => {
    generatePdf.mutate(invoicesWithoutFiles.map((inv) => inv.id));
  }, [generatePdf, invoicesWithoutFiles]);

  return {
    handleExportPdf,
    handleExportCsv,
    handleSaveTemplate,
    handleGeneratePdfForMissing,
  };
};
