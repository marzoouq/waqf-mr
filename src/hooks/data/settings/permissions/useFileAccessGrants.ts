/**
 * أذونات الملفات الفردية — يمنحها الناظر وحده لمستفيد محدد على ملف واحد (RLS: admin فقط).
 */
import { useQuery } from '@tanstack/react-query';
import { createCrudFactory } from '@/hooks/data/core/useCrudFactory';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type FileAccessGrant = Database['public']['Tables']['file_access_grants']['Row'];

const factory = createCrudFactory<'file_access_grants', FileAccessGrant>({
  table: 'file_access_grants',
  queryKey: 'file_access_grants',
  orderBy: 'created_at',
  ascending: false,
  limit: 500,
  label: 'الإذن الفردي',
});

export const useFileAccessGrants = factory.useList;
export const useCreateFileAccessGrant = factory.useCreate;
export const useDeleteFileAccessGrant = factory.useDelete;

export interface GrantableFile { path: string; label: string }
export interface GrantableBeneficiary { userId: string; name: string }

/** الملفات القابلة للإذن حسب الحاوية */
export function useGrantableFiles(bucket: string) {
  return useQuery({
    queryKey: ['grantable_files', bucket],
    enabled: !!bucket,
    staleTime: 60_000,
    queryFn: async (): Promise<GrantableFile[]> => {
      if (bucket === 'waqf-documents') {
        const { data, error } = await supabase.from('archived_documents').select('storage_path,title').limit(500);
        if (error) throw error;
        return (data ?? []).map((d) => ({ path: d.storage_path, label: d.title }));
      }
      if (bucket === 'disbursement-vouchers') {
        const { data, error } = await supabase.from('disbursement_vouchers')
          .select('pdf_path,voucher_number').eq('status', 'approved').not('pdf_path', 'is', null).limit(500);
        if (error) throw error;
        return (data ?? []).map((d) => ({ path: d.pdf_path as string, label: `سند ${d.voucher_number}` }));
      }
      if (bucket === 'invoices') {
        const { data, error } = await supabase.from('invoices')
          .select('file_path,invoice_number,file_name').not('file_path', 'is', null).limit(500);
        if (error) throw error;
        return (data ?? []).map((d) => ({ path: d.file_path as string, label: d.invoice_number ?? d.file_name ?? 'فاتورة' }));
      }
      return [];
    },
  });
}

/** المستفيدون المرتبطون بحساب دخول */
export function useGrantableBeneficiaries() {
  return useQuery({
    queryKey: ['grantable_beneficiaries'],
    staleTime: 60_000,
    queryFn: async (): Promise<GrantableBeneficiary[]> => {
      const { data, error } = await supabase.from('beneficiaries').select('name,user_id').not('user_id', 'is', null).order('name');
      if (error) throw error;
      return (data ?? []).map((b) => ({ userId: b.user_id as string, name: b.name }));
    },
  });
}
