import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

const INVOICE_TYPE_LABELS: Record<string, string> = {
  utilities: 'خدمات (كهرباء/مياه)',
  maintenance: 'صيانة ومقاولات',
  rent: 'إيجار',
  other: 'أخرى',
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  pending: 'معلّقة',
  paid: 'مدفوعة',
  cancelled: 'ملغاة',
};

export { INVOICE_TYPE_LABELS, INVOICE_STATUS_LABELS };

export const useInvoices = () => {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, property:properties(id, property_number, location), contract:contracts(id, contract_number, tenant_name)')
        .order('date', { ascending: false });

      if (error) throw error;
      return data as Invoice[];
    },
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoice: { invoice_type: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('invoices')
        .insert([invoice])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('تم إضافة الفاتورة بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء إضافة الفاتورة');
    },
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, file_path }: { id: string; file_path?: string | null }) => {
      // Delete file from storage if exists
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

export const uploadInvoiceFile = async (file: File): Promise<{ path: string; name: string }> => {
  const ext = file.name.split('.').pop();
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from('invoices').upload(path, file);
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
    .createSignedUrl(filePath, 3600); // 1 hour
  if (error) throw error;
  return data.signedUrl;
};
