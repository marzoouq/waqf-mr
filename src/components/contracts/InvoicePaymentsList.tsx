/**
 * قائمة دفعات العقد مع أزرار الإجراء (تسديد/إلغاء/تحميل)
 */
import { Button } from '@/components/ui/button';
import { Receipt, CheckCircle, Clock, AlertCircle, Check, X, Download, Loader2 } from 'lucide-react';
import { PaymentInvoice } from '@/hooks/data/usePaymentInvoices';
import { Contract } from '@/types/database';
import { getPaymentTypeLabel } from '@/utils/contractHelpers';
import { fmt } from '@/utils/format';

const invoiceStatusIcon: Record<string, React.ReactNode> = {
  paid: <CheckCircle className="w-3.5 h-3.5 text-success" />,
  pending: <Clock className="w-3.5 h-3.5 text-warning" />,
  overdue: <AlertCircle className="w-3.5 h-3.5 text-destructive" />,
  partially_paid: <Clock className="w-3.5 h-3.5 text-info" />,
};

const invoiceStatusLabel: Record<string, string> = {
  paid: 'مسددة',
  pending: 'معلقة',
  overdue: 'متأخرة',
  partially_paid: 'جزئية',
};

interface InvoicePaymentsListProps {
  contract: Contract;
  invoices: PaymentInvoice[];
  onPayInvoice?: (inv: PaymentInvoice) => void;
  onUnpayInvoice?: (invoiceId: string) => void;
  onDownloadInvoice?: (inv: PaymentInvoice) => void;
  loadingInvoiceId?: string | null;
  payingInvoiceId?: string | null;
  isClosed?: boolean;
}

const InvoicePaymentsList = ({
  contract,
  invoices,
  onPayInvoice,
  onUnpayInvoice,
  onDownloadInvoice,
  loadingInvoiceId,
  payingInvoiceId,
  isClosed,
}: InvoicePaymentsListProps) => {
  if (invoices.length === 0) return null;

  return (
    <div className="border-t border-border px-5 py-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Receipt className="w-3.5 h-3.5" />
        <span>دفعات {contract.contract_number} ({getPaymentTypeLabel(contract.payment_type)})</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {invoices.map(inv => (
          <div
            key={inv.id}
            className="flex items-center gap-2 rounded-md border border-border/50 bg-card px-3 py-2 text-sm"
          >
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6"
                  onClick={() => onDownloadInvoice(inv)}
                  title="تحميل PDF"
                  disabled={loadingInvoiceId === inv.id}
                >
                  {loadingInvoiceId === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                </Button>
              )}
              {!isClosed && inv.status !== 'paid' && onPayInvoice && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 text-success hover:text-success/80"
                  onClick={() => onPayInvoice(inv)}
                  title="تسديد"
                  disabled={payingInvoiceId === inv.id}
                >
                  {payingInvoiceId === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                </Button>
              )}
              {!isClosed && inv.status === 'paid' && onUnpayInvoice && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 text-muted-foreground"
                  onClick={() => onUnpayInvoice(inv.id)}
                  title="إلغاء التسديد"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InvoicePaymentsList;
