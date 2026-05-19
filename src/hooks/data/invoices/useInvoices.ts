/**
 * هوكات CRUD للفواتير
 * M2.2: استعلام fiscal-year + حذف يمران عبر invoicesService.
 */
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { invoke } from '@/lib/api/invoke';
import { uiNotify } from '@/lib/notify';
import { createCrudFactory } from '../core/useCrudFactory';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { invoicesService, INVOICES_SELECT } from '@/lib/services/invoicesService';

// إعادة تصدير أدوات الملفات للتوافق مع الاستيرادات الحالية
export { uploadInvoiceFile, getInvoiceSignedUrl, ALLOWED_MIME_TYPES, MAX_FILE_SIZE, VALID_EXTENSIONS } from './useInvoiceFileUtils';
import { isFyReady } from '@/constants/fiscalYearIds';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

export type { Invoice } from '@/types/invoices';
import type { Invoice } from '@/types/invoices';

export const INVOICE_TYPE_LABELS: Record<string, string> = {
  utilities: 'خدمات (كهرباء/مياه)',
  maintenance: 'صيانة ومقاولات',
  rent: 'إيجار',
  other: 'أخرى',
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  pending: 'معلّقة',
  paid: 'مدفوعة',
  cancelled: 'ملغاة',
  overdue: 'متأخرة',
};

// ---------------------------------------------------------------------------
// Factory-based CRUD
// ---------------------------------------------------------------------------

const invoicesCrud = createCrudFactory<'invoices', Invoice>({
  table: 'invoices',
  queryKey: 'invoices',
  select: INVOICES_SELECT,
  orderBy: 'date',
  ascending: false,
  label: 'الفاتورة',
});

export const useInvoices = invoicesCrud.useList;
export const useCreateInvoice = invoicesCrud.useCreate;
export const useUpdateInvoice = invoicesCrud.useUpdate;

/** Invoices filtered by fiscal year */
export const useInvoicesByFiscalYear = (fiscalYearId: string | 'all') => {
  return useQuery({
    queryKey: ['invoices', 'fiscal_year', fiscalYearId],
    enabled: isFyReady(fiscalYearId),
    staleTime: STALE_FINANCIAL,
    queryFn: () => invoicesService.listByFiscalYear(fiscalYearId),
  });
};

// ---------------------------------------------------------------------------
// CRIT-4: حذف DB أولاً ثم Storage — ترتيب صحيح (M2.2: عبر invoicesService)
// ---------------------------------------------------------------------------

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file_path }: { id: string; file_path?: string | null }) =>
      invoicesService.remove(id, file_path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      uiNotify.success('تم حذف الفاتورة بنجاح');
    },
    onError: () => {
      uiNotify.error('حدث خطأ أثناء حذف الفاتورة');
    },
  });
};

// ---------------------------------------------------------------------------
// Generate PDF for invoices without attachments
// ---------------------------------------------------------------------------

export interface GenerateInvoicePdfOptions {
  invoice_ids: string[];
  template?: 'professional' | 'simplified';
  forceRegenerate?: boolean;
  table?: 'invoices' | 'payment_invoices';
}

export const useGenerateInvoicePdf = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: string[] | GenerateInvoicePdfOptions) => {
      const opts: GenerateInvoicePdfOptions = Array.isArray(options)
        ? { invoice_ids: options }
        : options;

      // المصادقة تتم تلقائياً عبر JWT في Edge Function

      const body: Record<string, unknown> = { invoice_ids: opts.invoice_ids };
      if (opts.template) body.template = opts.template;
      if (opts.forceRegenerate) body.force_regenerate = true;
      if (opts.table) body.table = opts.table;

      return await invoke<{ results: { id: string; invoice_number: string | null; success: boolean; error?: string }[] }>(
        'generate-invoice-pdf',
        { body },
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      const successCount = data.results.filter((r) => r.success && r.error !== 'already has file').length;
      if (successCount > 0) {
        uiNotify.success(`تم توليد ${successCount} ملف PDF بنجاح`);
      } else {
        uiNotify.info('جميع الفواتير تحتوي على مرفقات بالفعل');
      }
    },
    onError: () => {
      uiNotify.error('حدث خطأ أثناء توليد ملفات PDF');
    },
  });
};
