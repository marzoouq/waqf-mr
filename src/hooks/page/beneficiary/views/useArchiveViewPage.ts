/**
 * هوك صفحة الأرشيف — للمستفيد والواقف. قراءة فقط (المنشور).
 */
import { useMemo, useState } from 'react';
import { useArchivedDocuments } from '@/hooks/data/archive/useArchivedDocuments';
import { useArchiveDocumentViewer } from '@/hooks/application/archive/useArchiveDocumentViewer';
import type { CategoryFilter } from '@/hooks/page/admin/management/useArchivePage';

export function useArchiveViewPage() {
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');

  const filters = useMemo(
    () => ({ category, search, publishedOnly: true }),
    [category, search],
  );
  const query = useArchivedDocuments(filters);
  const viewer = useArchiveDocumentViewer();

  return {
    isLoading: query.isLoading,
    isError: query.isError,
    documents: query.data ?? [],

    category, setCategory,
    search, setSearch,

    previewTarget: viewer.previewTarget,
    previewUrl: viewer.previewUrl,
    closePreview: viewer.closePreview,
    handlePreview: viewer.handlePreview,
    handleDownload: viewer.handleDownload,
    signedPending: viewer.signedPending,
  };
}
