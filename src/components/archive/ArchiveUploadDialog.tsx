/**
 * Dialog رفع وثيقة جديدة — PDF ≤ 10MB، تحقق Zod محلي قبل الرفع.
 */
import { useState, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload } from 'lucide-react';
import {
  ARCHIVE_CATEGORIES,
  ARCHIVE_CATEGORY_LABELS,
  ARCHIVE_FILE_LIMITS,
  type ArchiveCategory,
} from '@/types/archive';
import { archiveUploadSchema } from './archiveSchemas';
import { formatBytes } from '@/utils/format/fileSize';
import type { ArchiveUploadInput } from '@/hooks/data/archive/useArchivedDocumentMutations';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (input: Omit<ArchiveUploadInput, 'uploadedBy'>) => Promise<void>;
  pending: boolean;
}

const ArchiveUploadDialog = ({ open, onOpenChange, onSubmit, pending }: Props) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ArchiveCategory>('meeting_minutes');
  const [description, setDescription] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setTitle(''); setCategory('meeting_minutes'); setDescription('');
    setDocumentDate(''); setFile(null); setErrors({});
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const result = archiveUploadSchema.safeParse({
      title, category, description, document_date: documentDate, file,
    });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    await onSubmit({
      title: result.data.title,
      category: result.data.category,
      description: result.data.description || undefined,
      document_date: result.data.document_date || undefined,
      file: result.data.file,
    });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" /> رفع وثيقة جديدة
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="archive-title">العنوان <span className="text-destructive">*</span></Label>
            <Input
              id="archive-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="مثال: محضر اجتماع الناظر — يناير 2026"
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="archive-category">التصنيف <span className="text-destructive">*</span></Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ArchiveCategory)}>
              <SelectTrigger id="archive-category"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ARCHIVE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{ARCHIVE_CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="archive-date">تاريخ الوثيقة (اختياري)</Label>
            <Input
              id="archive-date"
              type="date"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="archive-desc">وصف مختصر (اختياري)</Label>
            <Textarea
              id="archive-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="وصف موجز لمحتوى الوثيقة..."
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
            <p className="text-xs text-muted-foreground">{description.length} / 500</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="archive-file">ملف PDF <span className="text-destructive">*</span></Label>
            <Input
              id="archive-file"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} — {formatBytes(file.size)}
              </p>
            )}
            {errors.file && <p className="text-xs text-destructive">{errors.file}</p>}
            <p className="text-xs text-muted-foreground">
              PDF فقط · الحد الأقصى {formatBytes(ARCHIVE_FILE_LIMITS.MAX_SIZE_BYTES)}
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              إلغاء
            </Button>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending && <Loader2 className="w-4 h-4 animate-spin" />}
              رفع الوثيقة
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ArchiveUploadDialog;
