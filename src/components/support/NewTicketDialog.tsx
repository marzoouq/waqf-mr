/**
 * مكون إنشاء تذكرة دعم جديدة
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useCreateTicket } from '@/hooks/data/useSupportTickets';

interface NewTicketDialogProps {
  open: boolean;
  onClose: () => void;
}

const NewTicketDialog = ({ open, onClose }: NewTicketDialogProps) => {
  const createTicket = useCreateTicket();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await createTicket.mutateAsync({ title, description, category, priority: 'medium' });
    setTitle(''); setDescription(''); setCategory('general');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>طلب دعم فني جديد</DialogTitle>
          <DialogDescription>صف المشكلة أو الطلب بالتفصيل</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input name="title" placeholder="عنوان الطلب *" value={title} onChange={e => setTitle(e.target.value)} />
          <Textarea placeholder="وصف تفصيلي للمشكلة..." value={description} onChange={e => setDescription(e.target.value)} />
          <NativeSelect value={category} onValueChange={setCategory} options={[
            { value: 'general', label: 'عام' },
            { value: 'technical', label: 'تقني' },
            { value: 'financial', label: 'مالي' },
            { value: 'account', label: 'حساب' },
            { value: 'suggestion', label: 'اقتراح' },
          ]} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button className="gradient-primary" onClick={handleSubmit} disabled={!title.trim() || createTicket.isPending}>
            {createTicket.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إرسال الطلب'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewTicketDialog;
