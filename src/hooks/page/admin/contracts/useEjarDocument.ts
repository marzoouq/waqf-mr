import { useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import {
  useContractDocuments, useContractsWithEjar, useUploadEjarDocument, useDeleteEjarDocument, getEjarDownloadUrl,
  type ContractDocumentRow, type EjarMeta,
} from '@/hooks/data/contracts/useContractDocuments';
import { validateEjarFile, ejarErrorMessage, ejarDatesMismatch } from '@/utils/contracts/ejarDocument';

export const useEjarDocument = (contract: { id: string; start_date: string; end_date: string }) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<EjarMeta>({});
  const { role } = useAuth();
  const docs = useContractDocuments(contract.id, open);
  const upload = useUploadEjarDocument(contract.id);
  const del = useDeleteEjarDocument(contract.id);
  const withEjar = useContractsWithEjar();

  const current = docs.data?.find(d => d.is_current) ?? null;
  const history = docs.data?.filter(d => !d.is_current) ?? [];
  const mismatch = current ? ejarDatesMismatch(current, contract) : false;

  const submit = async () => {
    const err = validateEjarFile(file);
    if (err) { toast.error(err); return; }
    try {
      await upload.mutateAsync({ file: file as File, meta });
      toast.success(current ? 'استُبدل عقد إيجار وأُرشفت النسخة السابقة' : 'رُفع عقد إيجار الموثق');
      setFile(null); setMeta({});
    } catch (e) {
      logger.error('[ejar] upload failed', e);
      toast.error(ejarErrorMessage(e));
    }
  };

  const download = async (doc: ContractDocumentRow) => {
    try { window.open(await getEjarDownloadUrl(doc.id), '_blank', 'noopener'); }
    catch (e) { logger.error('[ejar] download failed', e); toast.error('تعذّر تنزيل الملف'); }
  };

  const remove = async (doc: ContractDocumentRow) => {
    const reason = window.prompt('سبب حذف عقد إيجار الموثق:')?.trim();
    if (!reason) return;
    try { await del.mutateAsync({ doc, reason }); toast.success('حُذف الملف وسُجّل السبب'); }
    catch (e) { logger.error('[ejar] delete failed', e); toast.error('تعذّر حذف الملف'); }
  };

  return {
    hasEjar: withEjar.data?.has(contract.id) ?? false,
    open, setOpen, file, setFile, meta, setMeta, current, history, mismatch,
    isLoading: docs.isLoading, uploading: upload.isPending, canDelete: role === 'admin',
    submit, download, remove,
  };
};
