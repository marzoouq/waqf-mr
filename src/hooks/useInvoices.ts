import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCrudFactory } from './useCrudFactory';

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
};

// ---------------------------------------------------------------------------
// Factory-based CRUD
// ---------------------------------------------------------------------------

const invoicesCrud = useCrudFactory<'invoices', Invoice>({
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
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('*, property:properties(id, property_number, location), contract:contracts(id, contract_number, tenant_name)')
        .order('date', { ascending: false })
        .limit(500);
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
// Custom delete – cleans up storage file before deleting row
// ---------------------------------------------------------------------------

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, file_path }: { id: string; file_path?: string | null }) => {
      if (file_path) {
        await supabase.storage.from('invoices').remove([file_path]);
      }
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('تم حذف الفاتورة بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حذف الفاتورة');
    },
  });
};

// ---------------------------------------------------------------------------
// Storage utilities
// ---------------------------------------------------------------------------

export const uploadInvoiceFile = async (file: File): Promise<{ path: string; name: string }> => {
  const ext = file.name.split('.').pop();
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from('invoices').upload(path, file, {
    contentType: file.type,
  });
  if (error) throw error;

  return { path, name: file.name };
};

/** @deprecated Use getInvoiceSignedUrl instead – invoices bucket is private */
export const getInvoiceFileUrl = (_filePath: string) => {
  console.warn('getInvoiceFileUrl is deprecated. Use getInvoiceSignedUrl for private bucket access.');
  return '';
};

export const getInvoiceSignedUrl = async (filePath: string): Promise<string> => {
  const { data, error } = await supabase.storage
    .from('invoices')
    .download(filePath);

  if (error || !data) throw new Error('فشل في تحميل الملف');

  return URL.createObjectURL(data);
};

// ---------------------------------------------------------------------------
// Generate PDF for invoices without attachments
// ---------------------------------------------------------------------------

export const useGenerateInvoicePdf = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceIds: string[]) => {
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoice_ids: invoiceIds },
      });
      if (error) throw error;
      return data as { results: { id: string; invoice_number: string | null; success: boolean; error?: string }[] };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      const successCount = data.results.filter((r) => r.success && r.error !== 'already has file').length;
      if (successCount > 0) {
        toast.success(`تم توليد ${successCount} ملف PDF بنجاح`);
      } else {
        toast.info('جميع الفواتير تحتوي على مرفقات بالفعل');
      }
    },
    onError: () => {
      toast.error('حدث خطأ أثناء توليد ملفات PDF');
    },
  });
};
