/**
 * Page hook: لوحة الأذونات الفردية (ملف واحد لمستفيد محدد).
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  useFileAccessGrants, useCreateFileAccessGrant, useDeleteFileAccessGrant,
  useGrantableFiles, useGrantableBeneficiaries, type FileAccessGrant,
} from '@/hooks/data/settings/permissions/useFileAccessGrants';

export const GRANT_BUCKETS = ['invoices', 'disbursement-vouchers', 'waqf-documents'] as const;
export type GrantEffect = 'allow' | 'deny';

export function useFileAccessGrantsPanel() {
  const [bucket, setBucket] = useState<string>('waqf-documents');
  const [path, setPath] = useState('');
  const [userId, setUserId] = useState('');
  const [effect, setEffect] = useState<GrantEffect>('allow');
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');

  const grantsQ = useFileAccessGrants();
  const filesQ = useGrantableFiles(bucket);
  const bensQ = useGrantableBeneficiaries();
  const create = useCreateFileAccessGrant();
  const remove = useDeleteFileAccessGrant();

  const nameByUser = useMemo(
    () => new Map((bensQ.data ?? []).map((b) => [b.userId, b.name])), [bensQ.data]);

  const changeBucket = (b: string) => { setBucket(b); setPath(''); };

  const submit = async () => {
    if (!path || !userId) { toast.error('اختر الملف والمستفيد'); return; }
    try {
      await create.mutateAsync({
        bucket_id: bucket, object_path: path, user_id: userId, effect,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        notes: notes.trim() || null,
      });
      setPath(''); setNotes(''); setExpiresAt('');
    } catch { /* الإشعار يصدر من المصنع */ }
  };

  const revoke = (g: FileAccessGrant) => remove.mutate(g.id);

  return {
    bucket, changeBucket, path, setPath, userId, setUserId,
    effect, setEffect, expiresAt, setExpiresAt, notes, setNotes,
    files: filesQ.data ?? [], beneficiaries: bensQ.data ?? [],
    grants: (grantsQ.data ?? []) as FileAccessGrant[], nameByUser,
    isLoading: grantsQ.isLoading, submit, revoke,
    saving: create.isPending || remove.isPending,
  };
}
