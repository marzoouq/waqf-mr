/**
 * أزرار المرسل عند «تم الحل»: تأكيد الحل وإقفال التذكرة، أو إعادة فتحها مع سبب.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, RotateCcw } from 'lucide-react';
import { useOwnerTicketAction } from '@/hooks/data/support/useSupportTickets';
import { uiNotify } from '@/lib/notify';

const OwnerResolutionActions = ({ ticketId, onClosed }: { ticketId: string; onClosed: () => void }) => {
  const action = useOwnerTicketAction();
  const [reopening, setReopening] = useState(false);
  const [reason, setReason] = useState('');

  const run = (kind: 'close' | 'reopen') => action.mutate(
    { id: ticketId, action: kind, reason: kind === 'reopen' ? reason : undefined },
    {
      onSuccess: () => {
        uiNotify.success(kind === 'close' ? 'تم إقفال التذكرة' : 'أُعيد فتح التذكرة وأُبلغ ناظر الوقف');
        if (kind === 'close') onClosed();
        setReopening(false); setReason('');
      },
      onError: (e) => uiNotify.error(e instanceof Error ? e.message : 'تعذّر تنفيذ الإجراء'),
    },
  );

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-success/5">
      <p className="text-sm font-medium">هل تم حل مشكلتك؟</p>
      {reopening ? (
        <>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="اكتب سبب عدم الحل..." className="min-h-[60px]" />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setReopening(false)}>إلغاء</Button>
            <Button size="sm" onClick={() => run('reopen')} disabled={!reason.trim() || action.isPending}>إرسال وإعادة الفتح</Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="gap-1" onClick={() => run('close')} disabled={action.isPending}>
            <CheckCircle className="w-4 h-4" />تم الحل — أقفل التذكرة
          </Button>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setReopening(true)} disabled={action.isPending}>
            <RotateCcw className="w-4 h-4" />لم تُحل — أعد فتحها
          </Button>
        </div>
      )}
    </div>
  );
};

export default OwnerResolutionActions;
