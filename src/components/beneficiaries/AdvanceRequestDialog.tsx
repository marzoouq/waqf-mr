import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreateAdvanceRequest } from '@/hooks/useAdvanceRequests';
import { Banknote, Loader2 } from 'lucide-react';

interface AdvanceRequestDialogProps {
  beneficiaryId: string;
  fiscalYearId?: string;
  estimatedShare: number;
  paidAdvances: number;
}

const AdvanceRequestDialog = ({ beneficiaryId, fiscalYearId, estimatedShare, paidAdvances }: AdvanceRequestDialogProps) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const create = useCreateAdvanceRequest();

  const maxAdvance = Math.max(0, (estimatedShare * 0.5) - paidAdvances);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;
    await create.mutateAsync({
      beneficiary_id: beneficiaryId,
      fiscal_year_id: fiscalYearId,
      amount: numAmount,
      reason: reason || undefined,
    });
    setOpen(false);
    setAmount('');
    setReason('');
  };

  const numAmount = parseFloat(amount) || 0;
  const isOverLimit = numAmount > maxAdvance;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Banknote className="w-4 h-4" />
          طلب سلفة
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>طلب سلفة من الحصة</DialogTitle>
          <DialogDescription>
            يمكنك طلب سلفة مقدمة من حصتك (بحد أقصى 50% من الحصة التقديرية)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
            <div className="flex justify-between">
              <span>الحصة التقديرية</span>
              <span className="font-medium">{estimatedShare.toLocaleString()} ر.س</span>
            </div>
            <div className="flex justify-between">
              <span>سُلف سابقة</span>
              <span className="font-medium">{paidAdvances.toLocaleString()} ر.س</span>
            </div>
            <div className="flex justify-between border-t pt-1">
              <span>الحد الأقصى المتاح</span>
              <span className="font-bold text-primary">{maxAdvance.toLocaleString()} ر.س</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>المبلغ المطلوب (ر.س)</Label>
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              min="1"
              max={maxAdvance}
            />
            {isOverLimit && (
              <p className="text-xs text-destructive">المبلغ يتجاوز الحد الأقصى المسموح</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>السبب (اختياري)</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="سبب الطلب..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button
            onClick={handleSubmit}
            disabled={create.isPending || numAmount <= 0 || isOverLimit || maxAdvance <= 0}
          >
            {create.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            إرسال الطلب
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdvanceRequestDialog;
