/**
 * هوك صفحة الأرشيف — للمستفيد والواقف. قراءة فقط (المنشور).
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useArchivedDocuments } from '@/hooks/data/archive/useArchivedDocuments';
import { useArchivedDocumentSignedUrl } from '@/hooks/data/archive/useArchivedDocumentSignedUrl';
import type { ArchivedDocument } from '@/types/archive';
import type { CategoryFilter } from '@/hooks/page/admin/management/useArchivePage';

export function useArchiveViewPage() {
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');
  const [previewTarget, setPreviewTarget] = useState<ArchivedDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const filters = useMemo(
    () => ({ category, search, publishedOnly: true }),
    [category, search],
  );
  const query = useArchivedDocuments(filters);
  const signedM = useArchivedDocumentSignedUrl();

  const handlePreview = async (doc: ArchivedDocument) => {
    try {
      const url = await signedM.mutateAsync({ storagePath: doc.storage_path });
      setPreviewTarget(doc);
      setPreviewUrl(url);
    } catch (e) {
      toast.error('تعذّر فتح المعاينة', { description: (e as Error)?.message });
    }
  };

  const handleDownload = async (doc: ArchivedDocument) => {
    try {
      const url = await signedM.mutateAsync({
        storagePath: doc.storage_path,
        downloadAs: `${doc.title}.pdf`,
      });
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error('تعذّر التنزيل', { description: (e as Error)?.message });
    }
  };

  const closePreview = () => {
    setPreviewTarget(null);
    setPreviewUrl(null);
  };

  return {
    isLoading: query.isLoading,
    isError: query.isError,
    documents: query.data ?? [],

    category, setCategory,
    search, setSearch,

    previewTarget, previewUrl, closePreview,
    handlePreview, handleDownload,
    signedPending: signedM.isPending,
  };
}
