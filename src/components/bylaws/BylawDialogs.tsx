/**
 * حوارات إضافة/تعديل/حذف بنود اللائحة التنظيمية
 */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import type { BylawEntry } from '@/hooks/data/content/useBylaws';

interface NewBylawData {
  part_title: string;
  chapter_title: string;
  content: string;
  part_number: number;
}

interface AddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newBylaw: NewBylawData;
  setNewBylaw: React.Dispatch<React.SetStateAction<NewBylawData>>;
  onAdd: () => void;
  isPending: boolean;
}

export const BylawAddDialog = ({ open, onOpenChange, newBylaw, setNewBylaw, onAdd, isPending }: AddDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>إضافة بند جديد</DialogTitle>
        <DialogDescription>أضف بنداً جديداً إلى اللائحة التنظيمية. يدعم المحتوى تنسيق Markdown.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4" dir="rtl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="bylaw-part-number" className="text-sm font-medium">رقم الجزء</label>
            <Input
              id="bylaw-part-number"
              name="bylaw-part-number"
              type="number"
              min={0}
              value={newBylaw.part_number}
              onChange={(e) => setNewBylaw((p) => ({ ...p, part_number: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="bylaw-part-title" className="text-sm font-medium">عنوان الجزء *</label>
            <Input
              id="bylaw-part-title"
              name="bylaw-part-title"
              value={newBylaw.part_title}
              onChange={(e) => setNewBylaw((p) => ({ ...p, part_title: e.target.value }))}
              placeholder="مثال: أحكام عامة"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="bylaw-chapter-title" className="text-sm font-medium">عنوان الفصل (اختياري)</label>
          <Input
            id="bylaw-chapter-title"
            name="bylaw-chapter-title"
            value={newBylaw.chapter_title}
            onChange={(e) => setNewBylaw((p) => ({ ...p, chapter_title: e.target.value }))}
            placeholder="مثال: الفصل الأول - التعريفات"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="bylaw-content" className="text-sm font-medium">المحتوى (يدعم Markdown)</label>
          <Textarea
            id="bylaw-content"
            name="bylaw-content"
            value={newBylaw.content}
            onChange={(e) => setNewBylaw((p) => ({ ...p, content: e.target.value }))}
            className="min-h-[200px] font-mono text-sm"
            placeholder="اكتب محتوى البند هنا..."
          />
        </div>
      </div>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
        <Button onClick={onAdd} disabled={isPending || !newBylaw.part_title.trim()}>
          {isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
          إضافة البند
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

interface EditDialogProps {
  editItem: BylawEntry | null;
  onClose: () => void;
  editContent: string;
  setEditContent: (v: string) => void;
  editPartNumber: number;
  setEditPartNumber: (v: number) => void;
  editPartTitle: string;
  setEditPartTitle: (v: string) => void;
  editChapterTitle: string;
  setEditChapterTitle: (v: string) => void;
  editChapterNumber: number | null;
  setEditChapterNumber: (v: number | null) => void;
  onSave: () => void;
  isPending: boolean;
}

export const BylawEditDialog = ({
  editItem, onClose, editContent, setEditContent,
  editPartNumber, setEditPartNumber, editPartTitle, setEditPartTitle,
  editChapterTitle, setEditChapterTitle, editChapterNumber, setEditChapterNumber,
  onSave, isPending,
}: EditDialogProps) => (
  <Dialog open={!!editItem} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-w-2xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle>تعديل: {editItem?.chapter_title || editItem?.part_title}</DialogTitle>
        <DialogDescription>يمكنك تعديل المحتوى باستخدام تنسيق Markdown. سيتم تسجيل التعديل في سجل المراجعة.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 overflow-y-auto max-h-[50vh]" dir="rtl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="edit-bylaw-part-number" className="text-sm font-medium">رقم الجزء</label>
            <Input id="edit-bylaw-part-number" name="edit-bylaw-part-number" type="number" min={0} value={editPartNumber} onChange={(e) => setEditPartNumber(parseInt(e.target.value) || 0)} />
          </div>
          <div className="space-y-2">
            <label htmlFor="edit-bylaw-part-title" className="text-sm font-medium">عنوان الجزء *</label>
            <Input id="edit-bylaw-part-title" name="edit-bylaw-part-title" value={editPartTitle} onChange={(e) => setEditPartTitle(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="edit-bylaw-chapter-number" className="text-sm font-medium">رقم الفصل (اختياري)</label>
            <Input id="edit-bylaw-chapter-number" name="edit-bylaw-chapter-number" type="number" min={0} value={editChapterNumber ?? ''} onChange={(e) => setEditChapterNumber(e.target.value ? parseInt(e.target.value) : null)} placeholder="—" />
          </div>
          <div className="space-y-2">
            <label htmlFor="edit-bylaw-chapter-title" className="text-sm font-medium">عنوان الفصل (اختياري)</label>
            <Input id="edit-bylaw-chapter-title" name="edit-bylaw-chapter-title" value={editChapterTitle} onChange={(e) => setEditChapterTitle(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="edit-bylaw-content" className="text-sm font-medium">المحتوى (يدعم Markdown)</label>
          <Textarea id="edit-bylaw-content" name="edit-bylaw-content" value={editContent} onChange={(e) => setEditContent(e.target.value)} className="min-h-[250px] font-mono text-sm" />
        </div>
      </div>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose}>إلغاء</Button>
        <Button onClick={onSave} disabled={isPending}>
          {isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
          حفظ التعديلات
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

interface DeleteDialogProps {
  deleteItem: BylawEntry | null;
  onClose: () => void;
  onDelete: () => void;
  isPending: boolean;
}

export const BylawDeleteDialog = ({ deleteItem, onClose, onDelete, isPending }: DeleteDialogProps) => (
  <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && onClose()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>حذف البند</AlertDialogTitle>
        <AlertDialogDescription>
          هل أنت متأكد من حذف بند "{deleteItem?.chapter_title || deleteItem?.part_title}"؟ لا يمكن التراجع عن هذا الإجراء.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>إلغاء</AlertDialogCancel>
        <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
          {isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
          حذف
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
