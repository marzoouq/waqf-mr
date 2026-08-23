/**
 * هوك صفحة أرشيف الوثائق — لوحة الناظر/المحاسب.
 * يجمّع البيانات + الفلاتر + الطفرات + التحكم بالـ dialogs.
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { useArchivedDocuments } from '@/hooks/data/archive/useArchivedDocuments';
import {
  useUploadArchivedDocument,
  useUpdateArchivedDocument,
  useToggleArchivedDocumentPublish,
  useDeleteArchivedDocument,
  type ArchiveUploadInput,
  type ArchiveUpdateInput,
} from '@/hooks/data/archive/useArchivedDocumentMutations';
import { useArchiveDocumentViewer } from '@/hooks/application/archive/useArchiveDocumentViewer';
import type { ArchiveCategory, ArchivedDocument } from '@/types/archive';

export type CategoryFilter = ArchiveCategory | 'all';

export function useArchivePage() {
  const { role, user } = useAuth();
  const canWrite = role === 'admin';

  const [category, setCategory] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ArchivedDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ArchivedDocument | null>(null);

  const filters = useMemo(() => ({ category, search }), [category, search]);
  const query = useArchivedDocuments(filters);

  const uploadM = useUploadArchivedDocument();
  const updateM = useUpdateArchivedDocument();
  const toggleM = useToggleArchivedDocumentPublish();
  const deleteM = useDeleteArchivedDocument();
  const viewer = useArchiveDocumentViewer();

  const stats = useMemo(() => {
    const docs = query.data ?? [];
    return {
      total: docs.length,
      published: docs.filter((d) => d.is_published).length,
      drafts: docs.filter((d) => !d.is_published).length,
    };
  }, [query.data]);

  const handleUpload = async (input: Omit<ArchiveUploadInput, 'uploadedBy'>) => {
    if (!user?.id) {
      toast.error('يجب تسجيل الدخول');
      return;
    }
    try {
      await uploadM.mutateAsync({ ...input, uploadedBy: user.id });
      toast.success('تم رفع الوثيقة');
      setUploadOpen(false);
    } catch (e) {
      toast.error('فشل رفع الوثيقة', { description: (e as Error)?.message });
    }
  };

  const handleUpdate = async (input: ArchiveUpdateInput) => {
    try {
      await updateM.mutateAsync(input);
      toast.success('تم تحديث الوثيقة');
      setEditTarget(null);
    } catch (e) {
      toast.error('فشل التحديث', { description: (e as Error)?.message });
    }
  };

  const handleTogglePublish = async (doc: ArchivedDocument) => {
    try {
      await toggleM.mutateAsync({ id: doc.id, isPublished: !doc.is_published });
      toast.success(doc.is_published ? 'تم إخفاء الوثيقة' : 'تم نشر الوثيقة');
    } catch (e) {
      toast.error('فشل تغيير الحالة', { description: (e as Error)?.message });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteM.mutateAsync(deleteTarget);
      toast.success('تم حذف الوثيقة');
      setDeleteTarget(null);
    } catch (e) {
      toast.error('فشل الحذف', { description: (e as Error)?.message });
    }
  };

  return {
    canWrite,
    isLoading: query.isLoading,
    isError: query.isError,
    documents: query.data ?? [],
    stats,

    category, setCategory,
    search, setSearch,

    uploadOpen, setUploadOpen,
    editTarget, setEditTarget,
    deleteTarget, setDeleteTarget,
    previewTarget: viewer.previewTarget,
    previewUrl: viewer.previewUrl,
    closePreview: viewer.closePreview,

    handleUpload, uploadPending: uploadM.isPending,
    handleUpdate, updatePending: updateM.isPending,
    handleTogglePublish, togglePending: toggleM.isPending,
    handleDelete, deletePending: deleteM.isPending,
    handlePreview: viewer.handlePreview,
    handleDownload: viewer.handleDownload,
    signedPending: viewer.signedPending,
  };
}
