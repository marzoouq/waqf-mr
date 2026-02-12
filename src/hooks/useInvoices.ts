import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  const { data } = supabase.storage.from('invoices').getPublicUrl(filePath);
  return data.publicUrl;
};

export const getInvoiceSignedUrl = async (filePath: string) => {
  const { data, error } = await supabase.storage
    .from('invoices')
    .createSignedUrl(filePath, 3600);
  if (error) throw error;
  return data.signedUrl;
};
