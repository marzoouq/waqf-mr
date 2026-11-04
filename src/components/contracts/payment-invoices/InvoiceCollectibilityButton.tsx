import { Ban, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useInvoiceCollectibilityDialog } from '@/hooks/page/admin/financial/useInvoiceCollectibilityDialog';

export function InvoiceCollectibilityButton({ id, uncollectible }: { id: string; uncollectible: boolean }) {
  const state = useInvoiceCollectibilityDialog(id, uncollectible);
  if (!state.isAdmin) return null;
  const title = uncollectible ? 'إعادة إتاحة التحصيل' : 'غير قابلة للتحصيل';
  return <>
    <Button size="sm" variant="ghost" title={title} aria-label={title} onClick={() => state.setOpen(true)}>
      {uncollectible ? <RotateCcw className="size-4" /> : <Ban className="size-4" />}
    </Button>
    <Dialog open={state.open} onOpenChange={state.setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>يُسجّل القرار وسببه دون حذف الفاتورة أو تغيير حسابات السنوات المقفلة. هذا التصنيف ليس إسقاطاً قانونياً للدين.</DialogDescription></DialogHeader>
        <Label htmlFor={`collection-reason-${id}`}>السبب</Label>
        <Textarea id={`collection-reason-${id}`} value={state.reason} maxLength={500} onChange={e => state.setReason(e.target.value)} />
        <DialogFooter><Button variant="outline" onClick={() => state.setOpen(false)}>إلغاء</Button><Button disabled={state.pending || state.reason.trim().length < 3} onClick={state.confirm}>تأكيد القرار</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}