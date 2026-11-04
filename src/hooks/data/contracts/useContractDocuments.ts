import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { rpc } from '@/lib/api/rpc';

export const CONTRACT_DOCS_BUCKET = 'contract-documents';

export interface ContractDocumentRow {
  id: string;
  contract_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  ejar_number: string | null;
  documented_at: string | null;
  ejar_start_date: string | null;
  ejar_end_date: string | null;
  is_current: boolean;
  archived_at: string | null;
  archive_reason: string | null;
  created_at: string;
}

export interface EjarMeta {
  ejarNumber?: string;
  documentedAt?: string;
  startDate?: string;
  endDate?: string;
}

const key = (contractId: string) => ['contract_documents', contractId];

/** All Ejar document versions for a contract (current first). */
export const useContractDocuments = (contractId: string, enabled = true) =>
  useQuery({
    queryKey: key(contractId),
    enabled: enabled && !!contractId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('contract_documents').select('*')
        .eq('contract_id', contractId).order('is_current', { ascending: false }).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContractDocumentRow[];
    },
  });

/** Contract ids that already have a current Ejar document. */
export const useContractsWithEjar = () =>
  useQuery({
    queryKey: ['contract_documents', 'current_ids'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('contract_documents').select('contract_id').eq('is_current', true).limit(2000);
      if (error) throw error;
      return new Set((data ?? []).map(d => d.contract_id));
    },
  });

/** Upload a new version; the previous current one is archived (never lost). */
export const useUploadEjarDocument = (contractId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, meta }: { file: File; meta: EjarMeta }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error('غير مسجل الدخول');
      const ext = (file.name.split('.').pop() ?? 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `${contractId}/ejar-${Date.now()}.${ext}`;
      const up = await supabase.storage.from(CONTRACT_DOCS_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw up.error;
      const arch = await supabase.from('contract_documents')
        .update({ is_current: false, archived_at: new Date().toISOString(), archive_reason: 'استُبدل بنسخة أحدث' })
        .eq('contract_id', contractId).eq('is_current', true);
      if (arch.error) throw arch.error;
      const ins = await supabase.from('contract_documents').insert({
        contract_id: contractId, storage_path: path, file_name: file.name, mime_type: file.type,
        file_size_bytes: file.size, uploaded_by: uid,
        ejar_number: meta.ejarNumber || null, documented_at: meta.documentedAt || null,
        ejar_start_date: meta.startDate || null, ejar_end_date: meta.endDate || null,
      });
      if (ins.error) throw ins.error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract_documents'] }); },
  });
};

/** Admin-only hard delete (with reason logged in audit via archive_reason update first). */
export const useDeleteEjarDocument = (contractId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ doc, reason }: { doc: ContractDocumentRow; reason: string }) => {
      const u = await supabase.from('contract_documents').update({ archive_reason: `حذف: ${reason}` }).eq('id', doc.id);
      if (u.error) throw u.error;
      const del = await supabase.from('contract_documents').delete().eq('id', doc.id);
      if (del.error) throw del.error;
      await supabase.storage.from(CONTRACT_DOCS_BUCKET).remove([doc.storage_path]);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key(contractId) }); qc.invalidateQueries({ queryKey: ['contract_documents'] }); },
  });
};

/** Logs the download server-side, then returns a short-lived signed URL. */
export const getEjarDownloadUrl = async (docId: string): Promise<string> => {
  const path = (await rpc('log_contract_document_download', { p_document_id: docId })) as unknown as string;
  const { data, error } = await supabase.storage.from(CONTRACT_DOCS_BUCKET).createSignedUrl(path, 120);
  if (error || !data) throw error ?? new Error('تعذّر إنشاء الرابط');
  return data.signedUrl;
};
