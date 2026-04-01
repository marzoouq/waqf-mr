/**
 * CRUD فواتير — العمليات الأساسية فقط
 * أدوات الملفات والتوليد في useInvoiceHelpers.ts
 */

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { defaultNotify } from './mutationNotify';
import { createCrudFactory } from './useCrudFactory';
import { logger } from '@/lib/logger';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';

// إعادة تصدير من useInvoiceHelpers للتوافق مع الاستيرادات الحالية
export {
  ALLOWED_MIME_TYPES, MAX_FILE_SIZE, VALID_EXTENSIONS,
  uploadInvoiceFile, getInvoiceSignedUrl,
  useGenerateInvoicePdf,
} from './useInvoiceHelpers';
export type { GenerateInvoicePdfOptions } from './useInvoiceHelpers';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

export interface Invoice {
  id: string;
  invoice_number: string | null;
  invoice_type: string;
  amount: number;
  date: string;
  property_id: string | null;
  contract_id: string | null;
  expense_id: string | null;
  description: string | null;
  file_path: string | null;
  file_name: string | null;
  status: string;
  fiscal_year_id: string | null;
  vat_rate: number;
  vat_amount: number;
  amount_excluding_vat: number | null;
  zatca_uuid: string | null;
  zatca_status: string;
  created_at: string;
  updated_at: string;
  property?: { id: string; property_number: string; location: string } | null;
  contract?: { id: string; contract_number: string; tenant_name: string } | null;
}

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
    enabled: fiscalYearId !== '__none__',
    staleTime: STALE_FINANCIAL,
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('*, property:properties(id, property_number, location), contract:contracts(id, contract_number, tenant_name)')
        .order('date', { ascending: false })
        .limit(1000);
      if (fiscalYearId !== 'all') {
        query = query.eq('fiscal_year_id', fiscalYearId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Invoice[];
    },
  });
};

// ---------------------------------------------------------------------------
// حذف فاتورة — DB أولاً ثم Storage
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
