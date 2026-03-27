/**
 * عرض فواتير الدفعات كبطاقات للجوال
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, Clock, AlertTriangle, Check, X, Download, Loader2, Eye } from 'lucide-react';
import { fmt } from '@/utils/format';
import type { PaymentInvoice } from '@/hooks/data/usePaymentInvoices';

interface PaymentInvoiceMobileCardsProps {
  groupedPaginated: Map<string, PaymentInvoice[]>;
  isClosed: boolean;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  payingInvoiceId: string | null;
  openPayDialog: (inv: PaymentInvoice) => void;
  handlePreviewTemplate: (inv: PaymentInvoice) => void;
  markUnpaid: { mutate: (id: string) => void; isPending: boolean };
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'paid': return <Badge className="bg-success/20 text-success border-0 gap-1"><CheckCircle2 className="w-3 h-3" />مسددة</Badge>;
    case 'overdue': return <Badge className="bg-destructive/20 text-destructive border-0 gap-1"><AlertTriangle className="w-3 h-3" />متأخرة</Badge>;
    case 'pending': return <Badge className="bg-warning/20 text-warning border-0 gap-1"><Clock className="w-3 h-3" />قيد الانتظار</Badge>;
    case 'partially_paid': return <Badge className="bg-accent/20 text-accent-foreground border-0 gap-1"><Clock className="w-3 h-3" />جزئية</Badge>;
    default: return <Badge className="bg-muted text-muted-foreground border-0">{status}</Badge>;
  }
};

export default function PaymentInvoiceMobileCards({
  groupedPaginated, isClosed, selectedIds, toggleSelect,
  payingInvoiceId, openPayDialog, handlePreviewTemplate, markUnpaid,
}: PaymentInvoiceMobileCardsProps) {
  return (
    <div className="space-y-4 md:hidden px-3 py-2">
      {[...groupedPaginated.entries()].map(([contractId, invs]) => {
        const first = invs[0];
        return (
          <div key={contractId} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className="text-sm font-bold">{first?.contract?.contract_number || '-'}</span>
              <span className="text-xs text-muted-foreground">— {first?.contract?.tenant_name}</span>
            </div>
            {invs.map((inv) => (
              <Card key={inv.id} className={`shadow-sm border-r-4 ${
                inv.status === 'paid' ? 'border-r-success/60' :
                inv.status === 'overdue' ? 'border-r-destructive/60' :
                inv.status === 'partially_paid' ? 'border-r-warning/60' : 'border-r-muted-foreground/30'
              }`}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {!isClosed && inv.status !== 'paid' && (
                        <Checkbox checked={selectedIds.has(inv.id)} onCheckedChange={() => toggleSelect(inv.id)} />
                      )}
                      <span className="font-mono text-xs font-medium">{inv.invoice_number}</span>
                    </div>
                    {getStatusBadge(inv.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground text-xs">تاريخ الاستحقاق</span><p className="font-medium">{inv.due_date}</p></div>
                    <div><span className="text-muted-foreground text-xs">المبلغ</span><p className="font-medium">{fmt(Number(inv.amount))} ر.س</p></div>
                    {Number(inv.vat_amount) > 0 && <div><span className="text-muted-foreground text-xs">الضريبة</span><p className="font-medium">{fmt(Number(inv.vat_amount))} ر.س</p></div>}
                    {inv.paid_date && <div><span className="text-muted-foreground text-xs">تاريخ السداد</span><p className="font-medium text-success">{inv.paid_date}</p></div>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1 flex-1" onClick={() => handlePreviewTemplate(inv)}><Eye className="w-3.5 h-3.5" />معاينة</Button>
                    <Button size="sm" variant="outline" className="gap-1 flex-1" onClick={() => handlePreviewTemplate(inv)}><Download className="w-3.5 h-3.5" />PDF</Button>
                    {!isClosed && inv.status !== 'paid' && (
                      <Button size="sm" variant="outline" className="gap-1 flex-1 text-success" onClick={() => openPayDialog(inv)} disabled={payingInvoiceId === inv.id}>
                        {payingInvoiceId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}تسديد
                      </Button>
                    )}
                    {!isClosed && inv.status === 'paid' && (
                      <Button size="sm" variant="outline" className="gap-1 flex-1 text-muted-foreground" onClick={() => markUnpaid.mutate(inv.id)} disabled={markUnpaid.isPending}>
                        <X className="w-3.5 h-3.5" />إلغاء
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      })}
    </div>
  );
}
