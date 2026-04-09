/**
 * هوكات CRUD للفواتير
 */
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { defaultNotify } from '@/lib/notify';
import { createCrudFactory } from '../core/useCrudFactory';
import { logger } from '@/lib/logger';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';

// إعادة تصدير أدوات الملفات للتوافق مع الاستيرادات الحالية
export { uploadInvoiceFile, getInvoiceSignedUrl, ALLOWED_MIME_TYPES, MAX_FILE_SIZE, VALID_EXTENSIONS } from './useInvoiceFileUtils';
import { isFyReady, isFyAll } from '@/constants/fiscalYearIds';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

// Re-export Invoice type from canonical location
export type { Invoice } from '@/types/invoices';

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
  select: '*, property:properties(id, property_number, location), contract:contracts(id, contract_number, tenant_name)',
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
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('*, property:properties(id, property_number, location), contract:contracts(id, contract_number, tenant_name)')
        .order('date', { ascending: false })
        .limit(1000);
      if (!isFyAll(fiscalYearId)) {
        query = query.eq('fiscal_year_id', fiscalYearId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Invoice[];
    },
  });
};

// ---------------------------------------------------------------------------
// CRIT-4: حذف DB أولاً ثم Storage — ترتيب صحيح
// ---------------------------------------------------------------------------

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, file_path }: { id: string; file_path?: string | null }) => {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;

      if (file_path) {
        try {
          await supabase.storage.from('invoices').remove([file_path]);
        } catch (storageErr) {
          logger.warn('فشل حذف ملف الفاتورة من التخزين — سيبقى كملف يتيم', { file_path, error: storageErr });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      defaultNotify.success('تم حذف الفاتورة بنجاح');
    },
    onError: () => {
      defaultNotify.error('حدث خطأ أثناء حذف الفاتورة');
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

      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body,
      });
      if (error) throw error;
      return data as { results: { id: string; invoice_number: string | null; success: boolean; error?: string }[] };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      const successCount = data.results.filter((r) => r.success && r.error !== 'already has file').length;
      if (successCount > 0) {
        defaultNotify.success(`تم توليد ${successCount} ملف PDF بنجاح`);
      } else {
        defaultNotify.info('جميع الفواتير تحتوي على مرفقات بالفعل');
      }
    },
    onError: () => {
      defaultNotify.error('حدث خطأ أثناء توليد ملفات PDF');
    },
  });
};
