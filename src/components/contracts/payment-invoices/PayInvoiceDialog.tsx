/**
 * PayInvoiceDialog — نافذة تسديد فاتورة دفعة (كلي/جزئي) — مشتركة بين تبويب الفواتير وبطاقات العقود
 */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Check } from 'lucide-react';
import { fmt } from '@/utils/format/format';
import type { PaymentInvoice } from '@/types';

interface PayInvoiceDialogProps {
  payDialog: { inv: PaymentInvoice } | null;
  setPayDialog: (v: { inv: PaymentInvoice } | null) => void;
  payAmount: string;
  setPayAmount: (v: string) => void;
  handlePay: () => void;
}

export default function PayInvoiceDialog({ payDialog, setPayDialog, payAmount, setPayAmount, handlePay }: PayInvoiceDialogProps) {
  return (
    <Dialog open={!!payDialog} onOpenChange={(open) => { if (!open) setPayDialog(null); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>تسديد فاتورة {payDialog?.inv.invoice_number}</DialogTitle>
          <DialogDescription>أدخل المبلغ المدفوع — إذا كان أقل من الإجمالي ستُسجّل كدفعة جزئية</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">إجمالي الفاتورة</span>
            <span className="font-bold">{fmt(Number(payDialog?.inv.amount || 0))} ر.س</span>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pay-invoice-amount">المبلغ المدفوع (ر.س)</Label>
            <Input name="payAmount" id="pay-invoice-amount" type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} min={0} max={Number(payDialog?.inv.amount || 0)} step="0.01" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setPayDialog(null)}>إلغاء</Button>
          <Button onClick={handlePay} className="gap-1"><Check className="w-4 h-4" />تسديد</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
