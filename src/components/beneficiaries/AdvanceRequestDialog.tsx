import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreateAdvanceRequest } from '@/hooks/useAdvanceRequests';
import { Banknote, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdvanceRequestDialogProps {
  beneficiaryId: string;
  fiscalYearId?: string;
  /** Fallback client-side estimated share (used only if RPC fails) */
  estimatedShare: number;
  /** Fallback client-side paid advances */
  paidAdvances: number;
  carryforwardBalance?: number;
  /** When true, the fiscal year is still active (shares not finalized) */
  isFiscalYearActive?: boolean;
  minAmount?: number;
  maxPercentage?: number;
}

interface ServerAdvanceData {
  estimated_share: number;
  active_carryforward: number;
  effective_share: number;
  paid_advances: number;
  max_percentage: number;
  max_advance: number;
}

const AdvanceRequestDialog = ({ beneficiaryId, fiscalYearId, estimatedShare, paidAdvances, carryforwardBalance = 0, isFiscalYearActive = false, minAmount = 0, maxPercentage = 50 }: AdvanceRequestDialogProps) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [serverData, setServerData] = useState<ServerAdvanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const create = useCreateAdvanceRequest();

  // Fetch server-side max advance when dialog opens
  useEffect(() => {
    if (!open || !beneficiaryId || !fiscalYearId) return;
    let cancelled = false;
    setLoading(true);
    Promise.resolve(supabase.rpc('get_max_advance_amount', {
      p_beneficiary_id: beneficiaryId,
      p_fiscal_year_id: fiscalYearId,
    })).then(({ data, error }) => {
      if (cancelled) return;
      if (!error && data && !(data as Record<string, unknown>).error) {
        setServerData(data as unknown as ServerAdvanceData);
      }
      setLoading(false);
    }).catch(() => {
      if (!cancelled) {
        setLoading(false);
        toast.warning('تعذّر التحقق من الحد الأقصى — يُرجى المراجعة يدوياً');
      }
    });
    return () => { cancelled = true; };
  }, [open, beneficiaryId, fiscalYearId]);

  // Use server values if available, fallback to client-side
  const effectiveShare = serverData ? serverData.effective_share : Math.max(0, estimatedShare - carryforwardBalance);
  const displayEstimatedShare = serverData ? serverData.estimated_share : estimatedShare;
  const displayCarryforward = serverData ? serverData.active_carryforward : carryforwardBalance;
  const displayPaidAdvances = serverData ? serverData.paid_advances : paidAdvances;
  const displayMaxPercentage = serverData ? serverData.max_percentage : maxPercentage;
  const maxAdvance = serverData ? serverData.max_advance : Math.max(0, (effectiveShare * (maxPercentage / 100)) - paidAdvances);

  const handleSubmit = async () => {
    if (!fiscalYearId) {
      toast.error('يجب تحديد السنة المالية قبل طلب السلفة');
      return;
    }
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0 || numAmount > maxAdvance) return;
    try {
      await create.mutateAsync({
        beneficiary_id: beneficiaryId,
        fiscal_year_id: fiscalYearId,
        amount: numAmount,
        reason: reason || undefined,
      });
      setOpen(false);
      setAmount('');
      setReason('');
      setServerData(null);
    } catch {
      // onError in the mutation already shows a toast
    }
  };

  const numAmount = parseFloat(amount) || 0;
  const isOverLimit = numAmount > maxAdvance;
  const isBelowMin = numAmount > 0 && numAmount < minAmount;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setServerData(null); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={isFiscalYearActive}>
          <Banknote className="w-4 h-4" />
          طلب سلفة
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>طلب سلفة من الحصة</DialogTitle>
        <DialogDescription>
            يمكنك طلب سلفة مقدمة من حصتك (بحد أقصى {displayMaxPercentage}% من الحصة الصافية)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center p-6 text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              جاري حساب الحد الأقصى...
            </div>
          ) : (
            <>
              <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                <div className="flex justify-between">
                  <span>الحصة التقديرية</span>
                  <span className="font-medium">{displayEstimatedShare.toLocaleString()} ر.س</span>
                </div>
                {displayCarryforward > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>فروق مرحّلة من سنوات سابقة</span>
                    <span className="font-medium">-{displayCarryforward.toLocaleString()} ر.س</span>
                  </div>
                )}
                {displayCarryforward > 0 && (
                  <div className="flex justify-between">
                    <span>الحصة بعد خصم المرحّل</span>
                    <span className="font-medium">{effectiveShare.toLocaleString()} ر.س</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>سُلف سابقة</span>
                  <span className="font-medium">{displayPaidAdvances.toLocaleString()} ر.س</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span>الحد الأقصى المتاح</span>
                  <span className="font-bold text-primary">{maxAdvance.toLocaleString()} ر.س</span>
                </div>
              </div>

              {displayCarryforward > 0 && (
                <div className="flex items-start gap-2 p-2 bg-warning/10 border border-warning/20 rounded text-xs">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <span>لديك فروق مرحّلة من سنوات سابقة ستُخصم من حصتك عند التوزيع</span>
                </div>
              )}

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
                {isBelowMin && (
                  <p className="text-xs text-destructive">الحد الأدنى للسلفة {minAmount.toLocaleString()} ر.س</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>السبب (اختياري)</Label>
                <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="سبب الطلب..." />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button
            onClick={handleSubmit}
            disabled={create.isPending || loading || numAmount <= 0 || isOverLimit || isBelowMin || maxAdvance <= 0}
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
