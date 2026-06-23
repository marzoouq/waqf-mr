/**
 * Dialog تعديل ميتاداتا وثيقة (بدون استبدال الملف).
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import {
  ARCHIVE_CATEGORIES,
  ARCHIVE_CATEGORY_LABELS,
  type ArchiveCategory,
  type ArchivedDocument,
} from '@/types/archive';
import { archiveEditSchema } from './archiveSchemas';
import type { ArchiveUpdateInput } from '@/hooks/data/archive/useArchivedDocumentMutations';

interface Props {
  target: ArchivedDocument | null;
  onClose: () => void;
  onSubmit: (input: ArchiveUpdateInput) => Promise<void>;
  pending: boolean;
}

const ArchiveEditDialog = ({ target, onClose, onSubmit, pending }: Props) => {
  // مزامنة الحقول مع target عبر key على الحوار لتجنّب setState داخل effect
  if (!target) return null;
  return <ArchiveEditDialogInner key={target.id} target={target} onClose={onClose} onSubmit={onSubmit} pending={pending} />;
};

type InnerProps = Props & { target: NonNullable<Props['target']> };

const ArchiveEditDialogInner = ({ target, onClose, onSubmit, pending }: InnerProps) => {
  const [title, setTitle] = useState(target.title);
  const [category, setCategory] = useState<ArchiveCategory>(target.category);
  const [description, setDescription] = useState(target.description ?? '');
  const [documentDate, setDocumentDate] = useState(target.document_date ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const result = archiveEditSchema.safeParse({
      title, category, description, document_date: documentDate,
    });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) fieldErrors[issue.path[0] as string] = issue.message;
      setErrors(fieldErrors);
      return;
    }
    await onSubmit({
      id: target.id,
      title: result.data.title,
      category: result.data.category,
      description: result.data.description || null,
      document_date: result.data.document_date || null,
    });
  };

  return (
    <Dialog open={!!target} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader><DialogTitle>تعديل بيانات الوثيقة</DialogTitle></DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">العنوان</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-category">التصنيف</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ArchiveCategory)}>
              <SelectTrigger id="edit-category"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ARCHIVE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{ARCHIVE_CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-date">تاريخ الوثيقة</Label>
            <Input id="edit-date" type="date" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-desc">الوصف</Label>
            <Textarea id="edit-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} />
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>إلغاء</Button>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending && <Loader2 className="w-4 h-4 animate-spin" />}
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ArchiveEditDialog;
