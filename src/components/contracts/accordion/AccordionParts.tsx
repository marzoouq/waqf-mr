/**
 * مكوّنات فرعية لمجموعة العقود — صف الفاتورة وثوابت الحالة
 */
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, AlertCircle, Check, X, Download, Loader2 } from 'lucide-react';
import { fmt } from '@/utils/format';
import type { PaymentInvoice } from '@/hooks/data/usePaymentInvoices';

export const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'نشط', className: 'bg-success/20 text-success border-success/30' },
  expired: { label: 'منتهي', className: 'bg-destructive/20 text-destructive border-destructive/30' },
  pending: { label: 'معلق', className: 'bg-warning/20 text-warning border-warning/30' },
};

export const invoiceStatusIcon: Record<string, React.ReactNode> = {
  paid: <CheckCircle className="w-3.5 h-3.5 text-success" />,
  pending: <Clock className="w-3.5 h-3.5 text-warning" />,
  overdue: <AlertCircle className="w-3.5 h-3.5 text-destructive" />,
  partially_paid: <Clock className="w-3.5 h-3.5 text-info" />,
};

export const invoiceStatusLabel: Record<string, string> = {
  paid: 'مسددة',
  pending: 'معلقة',
  overdue: 'متأخرة',
  partially_paid: 'جزئية',
};

interface InvoiceCardProps {
  inv: PaymentInvoice;
  onDownloadInvoice?: (inv: PaymentInvoice) => void;
  onPayInvoice?: (inv: PaymentInvoice) => void;
  onUnpayInvoice?: (invoiceId: string) => void;
  loadingInvoiceId?: string | null;
  payingInvoiceId?: string | null;
  isClosed?: boolean;
}

/** بطاقة فاتورة دفعة واحدة */
export const InvoiceCard = ({
  inv, onDownloadInvoice, onPayInvoice, onUnpayInvoice,
  loadingInvoiceId, payingInvoiceId, isClosed,
}: InvoiceCardProps) => (
  <div className="flex items-center gap-2 rounded-md border border-border/50 bg-card px-3 py-2 text-sm">
    {invoiceStatusIcon[inv.status] || <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
    <span className="text-muted-foreground">دفعة {inv.payment_number}</span>
    <span className="font-medium mr-auto">{fmt(Number(inv.amount))} ر.س</span>
    <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
      inv.status === 'paid' ? 'bg-success/15 text-success'
        : inv.status === 'overdue' ? 'bg-destructive/15 text-destructive'
        : 'bg-warning/15 text-warning'
    }`}>
      {invoiceStatusLabel[inv.status] || inv.status}
    </span>
    <div className="flex gap-0.5 mr-1">
      {onDownloadInvoice && (
        <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => onDownloadInvoice(inv)} title="تحميل PDF" disabled={loadingInvoiceId === inv.id}>
          {loadingInvoiceId === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
        </Button>
      )}
      {!isClosed && inv.status !== 'paid' && onPayInvoice && (
        <Button variant="ghost" size="icon" className="w-6 h-6 text-success hover:text-success/80" onClick={() => onPayInvoice(inv)} title="تسديد" disabled={payingInvoiceId === inv.id}>
          {payingInvoiceId === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        </Button>
      )}
      {!isClosed && inv.status === 'paid' && onUnpayInvoice && (
        <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground" onClick={() => onUnpayInvoice(inv.id)} title="إلغاء التسديد">
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  </div>
);
