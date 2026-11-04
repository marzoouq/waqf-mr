/**
 * بطاقة تأكيد تسليم التوزيعات المعلقة — للناظر فقط.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HandCoins } from 'lucide-react';
import { fmt } from '@/utils/format/format';
import { useDistributionDeliveryCard } from '@/hooks/page/admin/financial/useDistributionDeliveryCard';
import type { DeliveryMethod } from '@/hooks/data/financial/distribution/useDistributionDelivery';

const DistributionDeliveryCard = ({ fiscalYearId }: { fiscalYearId?: string }) => {
  const c = useDistributionDeliveryCard(fiscalYearId);
  if (c.isLoading || c.items.length === 0) return null;

  return (
    <Card className="shadow-sm border-warning/40">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <HandCoins className="w-5 h-5" />
          توزيعات بانتظار التسليم ({c.items.length}) — {fmt(c.total)} ر.س
        </CardTitle>
        <Button size="sm" onClick={() => c.open(c.items.map((d) => d.id))}>تأكيد تسليم الكل</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {c.items.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
            <span className="font-medium truncate">{d.beneficiary_name}</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="tabular-nums">{fmt(d.amount)} ر.س</span>
              <Button size="sm" variant="outline" onClick={() => c.open([d.id])}>تأكيد التسليم</Button>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={!!c.targetIds} onOpenChange={(o) => !o && c.close()}>
        <DialogContent>
          <DialogHeader><DialogTitle>تأكيد تسليم {c.targetIds?.length ?? 0} توزيع</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label>تاريخ التسليم</Label>
              <Input type="date" value={c.paidAt} max={c.maxDate} onChange={(e) => c.setPaidAt(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label>طريقة التسليم</Label>
              <Select value={c.method} onValueChange={(v) => c.setMethod(v as DeliveryMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="cash">نقدًا</SelectItem>
                  <SelectItem value="cheque">شيك</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>المرجع (اختياري)</Label>
              <Input value={c.reference} maxLength={100} onChange={(e) => c.setReference(e.target.value)} placeholder="رقم الحوالة أو الشيك" />
            </div>
            <p className="text-xs text-muted-foreground">لا يتغير المبلغ ولا أرقام السنة — تتغير الحالة إلى «مدفوع» ويُشعَر المستفيد.</p>
          </div>
          <DialogFooter>
            <Button onClick={c.submit} disabled={c.isSubmitting || !c.paidAt}>
              {c.isSubmitting ? 'جارٍ التأكيد...' : 'تأكيد'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default DistributionDeliveryCard;
