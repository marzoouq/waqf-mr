/**
 * مُرفِع المرفقات لنموذج المصروف — سحب/إفلات، قائمة الملفات الجاهزة،
 * وقائمة المرفقات الحالية (وضع التعديل). مُستخرَج من ExpenseFormDialog لتقليل الحجم.
 * لا تغيير على السلوك أو المظهر.
 */
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, FileText, ImageIcon, Paperclip } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { StagedFile } from '@/hooks/ui/useMultipleFilesUpload';
import { DEFAULT_MAX_FILES } from '@/hooks/ui/useMultipleFilesUpload';

interface ExistingAttachment { id: string; file_name: string | null; file_path: string | null; }

interface Props {
  stagedFiles: StagedFile[];
  filesError?: string;
  isDragging: boolean;
  setIsDragging?: (v: boolean) => void;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
  onAddFiles: (list: FileList | File[] | null) => void;
  onRemoveStaged?: (id: string) => void;
  existingAttachments: ExistingAttachment[];
  onDeleteExisting?: (id: string, filePath: string | null) => void;
  deletingExistingId?: string | null;
}

const ExpenseAttachmentsUploader = ({
  stagedFiles, filesError, isDragging, setIsDragging, fileInputRef,
  onAddFiles, onRemoveStaged,
  existingAttachments, onDeleteExisting, deletingExistingId,
}: Props) => {
  const totalAttachments = existingAttachments.length + stagedFiles.length;
  const remainingSlots = DEFAULT_MAX_FILES - totalAttachments;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging?.(false);
    if (e.dataTransfer.files) onAddFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-2 pt-2 border-t">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5"><Paperclip className="w-4 h-4" />المرفقات (اختياري)</Label>
        <span className="text-xs text-muted-foreground">{totalAttachments}/{DEFAULT_MAX_FILES}</span>
      </div>
      <p className="text-xs text-muted-foreground">PDF أو صور (JPG/PNG/WEBP) — حتى 10 ملفات، كل ملف بحد أقصى 10 ميجابايت. تظهر في إفصاح المستفيد.</p>

      {existingAttachments.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">مرفقات حالية:</p>
          {existingAttachments.map((att) => (
            <div key={att.id} className="flex items-center justify-between gap-2 p-2 rounded-md border bg-muted/30">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{att.file_name || 'مستند'}</span>
              </div>
              {onDeleteExisting && (
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                  disabled={deletingExistingId === att.id}
                  onClick={() => onDeleteExisting(att.id, att.file_path)}
                  aria-label="حذف المرفق">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {remainingSlots > 0 && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging?.(true); }}
          onDragLeave={() => setIsDragging?.(false)}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          )}
          onClick={() => fileInputRef?.current?.click()}
        >
          <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
          <p className="text-sm text-muted-foreground">اسحب الملفات هنا أو انقر للاختيار</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => onAddFiles(e.target.files)}
          />
        </div>
      )}

      {filesError && <p role="alert" className="text-sm text-destructive">{filesError}</p>}

      {stagedFiles.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">جاهزة للرفع:</p>
          {stagedFiles.map((sf) => (
            <div key={sf.id} className="flex items-center justify-between gap-2 p-2 rounded-md border bg-background">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {sf.previewUrl ? (
                  <img src={sf.previewUrl} alt="" className="w-8 h-8 object-cover rounded shrink-0" />
                ) : sf.file.type.startsWith('image/') ? (
                  <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{sf.file.name}</p>
                  <p className="text-xs text-muted-foreground">{(sf.file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                onClick={() => onRemoveStaged?.(sf.id)} aria-label="إزالة الملف">
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExpenseAttachmentsUploader;
