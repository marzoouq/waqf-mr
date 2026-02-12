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
        .order('date', { ascending: false });
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

export const getInvoiceFileUrl = (filePath: string) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/serve-invoice?path=${encodeURIComponent(filePath)}`;
};

export const getInvoiceSignedUrl = async (filePath: string): Promise<string> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('يجب تسجيل الدخول لعرض الفواتير');
  
  const url = `${supabaseUrl}/functions/v1/serve-invoice?path=${encodeURIComponent(filePath)}`;
  
  // Fetch the file with auth header and create a blob URL
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });
  
  if (!response.ok) throw new Error('فشل في تحميل الملف');
  
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
