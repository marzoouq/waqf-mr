/**
 * Dialog معاينة PDF عبر signed URL داخل iframe.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { ArchivedDocument } from '@/types/archive';

interface Props {
  target: ArchivedDocument | null;
  url: string | null;
  onClose: () => void;
  onDownload: (doc: ArchivedDocument) => void;
}

const ArchivePdfPreviewDialog = ({ target, url, onClose, onDownload }: Props) => {
  if (!target || !url) return null;
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0"
        dir="rtl"
      >
        <DialogHeader className="p-4 border-b flex-row items-center justify-between gap-3 space-y-0">
          <DialogTitle className="truncate text-base">{target.title}</DialogTitle>
          <Button size="sm" variant="outline" onClick={() => onDownload(target)} className="gap-1.5 shrink-0">
            <Download className="w-4 h-4" /> تنزيل
          </Button>
        </DialogHeader>
        <iframe
          src={url}
          title={target.title}
          className="flex-1 w-full bg-muted"
          style={{ border: 0 }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ArchivePdfPreviewDialog;
