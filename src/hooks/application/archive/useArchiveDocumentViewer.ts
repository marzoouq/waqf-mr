/**
 * هوك مشترك لمعاينة/تنزيل وثائق الأرشيف — يمنع تكرار المنطق بين لوحات الأدوار.
 * (قاعدة عدم التكرار: أي منطق يظهر في أكثر من هوك صفحة يُستخرج هنا)
 */
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useArchivedDocumentSignedUrl } from '@/hooks/data/archive/useArchivedDocumentSignedUrl';
import type { ArchivedDocument } from '@/types/archive';

export function useArchiveDocumentViewer() {
  const [previewTarget, setPreviewTarget] = useState<ArchivedDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const signedM = useArchivedDocumentSignedUrl();

  const handlePreview = useCallback(async (doc: ArchivedDocument) => {
    try {
      const url = await signedM.mutateAsync({ storagePath: doc.storage_path });
      setPreviewTarget(doc);
      setPreviewUrl(url);
    } catch (e) {
      toast.error('تعذّر فتح المعاينة', { description: (e as Error)?.message });
    }
  }, [signedM]);

  const handleDownload = useCallback(async (doc: ArchivedDocument) => {
    try {
      const url = await signedM.mutateAsync({
        storagePath: doc.storage_path,
        downloadAs: `${doc.title}.pdf`,
      });
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error('تعذّر التنزيل', { description: (e as Error)?.message });
    }
  }, [signedM]);

  const closePreview = useCallback(() => {
    setPreviewTarget(null);
    setPreviewUrl(null);
  }, []);

  return {
    previewTarget,
    previewUrl,
    closePreview,
    handlePreview,
    handleDownload,
    signedPending: signedM.isPending,
  };
}
