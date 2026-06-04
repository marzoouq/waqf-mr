/**
 * هوك تصدير الفواتير + actions PDF/CSV/Template — مُستخرج من useInvoicesPage
 *
 * مسؤوليات: handleExportPdf, handleExportCsv, handleSaveTemplate, handleGeneratePdfForMissing
 */
import { useCallback } from 'react';
import { uiNotify } from '@/lib/notify';
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
      uiNotify.warning('⚠️ أنت تصدّر فواتير جميع السنوات المالية.');
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
      uiNotify.success(PDF_MESSAGES.downloadSuccess);
    } catch {
      uiNotify.error(PDF_MESSAGES.exportError);
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
    uiNotify.success('تم تصدير الفواتير بنجاح');
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
      uiNotify.success('تم إنشاء الفاتورة بنجاح');
    },
    [createInvoice, fiscalYearId, setTemplateOpen],
  );

  const handleGeneratePdfForMissing = useCallback(() => {
    const ids = invoicesWithoutFiles.map((inv) => inv.id);
    if (ids.length === 0) {
      uiNotify.info('جميع الفواتير تحتوي على مرفقات بالفعل');
      return;
    }
    generatePdf.mutate(ids, {
      onSuccess: (data) => {
        const successCount = data.results.filter(
          (r) => r.success && r.error !== 'already has file',
        ).length;
        if (successCount > 0) {
          uiNotify.success(`تم توليد ${successCount} ملف PDF بنجاح`);
        } else {
          uiNotify.info('جميع الفواتير تحتوي على مرفقات بالفعل');
        }
      },
      onError: () => uiNotify.error('حدث خطأ أثناء توليد ملفات PDF'),
    });
  }, [generatePdf, invoicesWithoutFiles]);

  return {
    handleExportPdf,
    handleExportCsv,
    handleSaveTemplate,
    handleGeneratePdfForMissing,
  };
};
