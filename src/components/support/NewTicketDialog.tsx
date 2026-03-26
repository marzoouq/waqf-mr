/**
 * حوار إنشاء تذكرة دعم فني جديدة
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Loader2 } from 'lucide-react';
import { useCreateTicket } from '@/hooks/data/useSupportTickets';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NewTicketDialog({ open, onClose }: Props) {
  const createTicket = useCreateTicket();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await createTicket.mutateAsync({ title, description, category, priority });
    setTitle(''); setDescription(''); setCategory('general'); setPriority('medium');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>تذكرة دعم فني جديدة</DialogTitle>
          <DialogDescription>أدخل تفاصيل المشكلة أو الطلب</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input id="ticket-title" name="ticket-title" placeholder="عنوان التذكرة *" value={title} onChange={e => setTitle(e.target.value)} />
          <Textarea placeholder="وصف تفصيلي..." value={description} onChange={e => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <NativeSelect value={category} onValueChange={setCategory} options={[
              { value: 'general', label: 'عام' }, { value: 'technical', label: 'تقني' },
              { value: 'financial', label: 'مالي' }, { value: 'account', label: 'حساب' },
              { value: 'suggestion', label: 'اقتراح' },
            ]} />
            <NativeSelect value={priority} onValueChange={setPriority} options={[
              { value: 'low', label: 'منخفض' }, { value: 'medium', label: 'متوسط' },
              { value: 'high', label: 'عالي' }, { value: 'critical', label: 'حرج' },
            ]} />
          </div>
          <Button onClick={handleSubmit} className="w-full gap-2" disabled={!title.trim() || createTicket.isPending}>
            {createTicket.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            إرسال التذكرة
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
