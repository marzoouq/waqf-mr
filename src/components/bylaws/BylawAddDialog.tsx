/**
 * حوار إضافة بند جديد للائحة
 */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

export interface NewBylawData {
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
          {isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
          إضافة البند
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
