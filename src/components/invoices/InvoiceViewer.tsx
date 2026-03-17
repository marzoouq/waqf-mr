import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileText } from 'lucide-react';
import { getInvoiceSignedUrl } from '@/hooks/useInvoices';
import { toast } from 'sonner';

interface InvoiceViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filePath: string | null;
  fileName: string | null;
}

const InvoiceViewer: React.FC<InvoiceViewerProps> = ({ open, onOpenChange, filePath, fileName }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isImage = fileName && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName);
  const isPdf = fileName && /\.pdf$/i.test(fileName);

  useEffect(() => {
    if (!open || !filePath) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      return;
    }

    // Revoke previous blob URL before creating a new one
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }

    const abortController = new AbortController();
    setLoading(true);
    getInvoiceSignedUrl(filePath)
      .then((url) => {
        if (!abortController.signal.aborted) setBlobUrl(url);
        else URL.revokeObjectURL(url);
      })
      .catch(() => {
        if (!abortController.signal.aborted) toast.error('فشل في تحميل الملف');
      })
      .finally(() => {
        if (!abortController.signal.aborted) setLoading(false);
      });

    return () => {
      abortController.abort();
      // تنظيف blob URL عند إلغاء التحميل لمنع تسرب الذاكرة
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filePath]);

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName || 'document';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 flex flex-row items-center justify-between gap-4 border-b">
          <div className="flex-1 min-w-0">
            <DialogTitle className="truncate">{fileName || 'عرض الملف'}</DialogTitle>
            <DialogDescription className="sr-only">عرض ملف الفاتورة</DialogDescription>
          </div>
          {blobUrl && (
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={handleDownload}>
              <Download className="w-4 h-4" />
              تحميل
            </Button>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-auto flex items-center justify-center p-4">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p>جاري تحميل الملف...</p>
            </div>
          ) : !blobUrl ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <FileText className="w-12 h-12" />
              <p>لا يمكن عرض الملف</p>
            </div>
          ) : isPdf ? (
            <iframe src={blobUrl} className="w-full h-full rounded border" title={fileName || 'PDF'} />
          ) : isImage ? (
            <img src={blobUrl} alt={fileName || 'صورة'} className="max-w-full max-h-full object-contain rounded" />
          ) : (
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <FileText className="w-16 h-16" />
              <p>لا يمكن معاينة هذا النوع من الملفات</p>
              <Button onClick={handleDownload} className="gap-2">
                <Download className="w-4 h-4" />
                تحميل الملف
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceViewer;
