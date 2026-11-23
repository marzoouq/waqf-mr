/**
 * ملخص الفواتير (الهوية الوقفية) — نفس الحسابات السابقة حرفيًا، تغيّر العرض فقط.
 */
import { safeNumber } from '@/utils/format/safeNumber';
import { CheckCircle2, Clock, AlertTriangle, Ban } from 'lucide-react';
import { FigureTile, FigureTileGrid } from '@/components/common';
import { DOMAIN_ICONS } from '@/constants/domainIcons';
import { cn } from '@/lib/cn';
import { fmt } from '@/utils/format/format';

interface InvoiceLike {
  status: string;
  amount: number;
  paid_amount?: number;
  vat_amount?: number;
}

interface InvoiceSummaryCardsProps {
  invoices: InvoiceLike[];
  isLoading: boolean;
}

const Sar = ({ value }: { value: number }) => <><bdi dir="ltr" className="num">{fmt(value)}</bdi> ر.س</>;

const InvoiceSummaryCards = ({ invoices, isLoading }: InvoiceSummaryCardsProps) => {
  if (isLoading) return <FigureTileGrid isLoading cols="lg:grid-cols-5" skeletonCount={5} />;

  const total = invoices.length;
  // المسدد يشمل paid و partially_paid (موحّد عبر التطبيق)
  const paid = invoices.filter(i => i.status === 'paid' || i.status === 'partially_paid');
  const pending = invoices.filter(i => i.status === 'pending');
  const overdue = invoices.filter(i => i.status === 'overdue');
  const cancelled = invoices.filter(i => i.status === 'cancelled');
  const totalAmount = invoices.reduce((s, i) => s + safeNumber(i.amount), 0);
  // المبلغ المحصّل: paid_amount عند توفره (فواتير الإيجار)، وإلا amount (فواتير الشراء المسددة)
  const paidAmount = paid.reduce((s, i) => s + safeNumber(i.paid_amount ?? i.amount), 0);
  const totalVat = invoices.reduce((s, i) => s + safeNumber(i.vat_amount ?? 0), 0);
  // نسبة التحصيل بالمبلغ (موحدة مع PaymentInvoicesTab)
  const collectionRate = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
  const pendingAmount = pending.reduce((s, i) => s + safeNumber(i.amount), 0);
  const overdueAmount = overdue.reduce((s, i) => s + safeNumber(i.amount), 0);
  const rateTone = collectionRate >= 70 ? 'success' : collectionRate >= 40 ? 'warning' : 'expense';

  return (
    <FigureTileGrid cols="sm:grid-cols-3 lg:grid-cols-5">
      <FigureTile label="إجمالي الفواتير" value={total} icon={DOMAIN_ICONS.invoice} unit="count" hint={<Sar value={totalAmount} />} />
      <FigureTile label="المسددة" value={paid.length} icon={CheckCircle2} tone="success" unit="count" hint={<Sar value={paidAmount} />} />
      <FigureTile label="قيد الانتظار" value={pending.length} icon={Clock} tone="warning" unit="count" hint={<Sar value={pendingAmount} />} />
      <FigureTile
        label="المتأخرة" value={overdue.length + cancelled.length} unit="count"
        icon={overdue.length > 0 ? AlertTriangle : Ban} tone={overdue.length > 0 ? 'expense' : 'neutral'}
        hint={overdue.length > 0 ? <Sar value={overdueAmount} /> : 'لا يوجد'}
      />
      <FigureTile
        label="نسبة التحصيل" value={collectionRate} unit="percent" icon={DOMAIN_ICONS.income} tone={rateTone}
        hint={totalVat > 0 ? <>ضريبة: <Sar value={totalVat} /></> : 'بدون ضريبة'}
        className="col-span-2 sm:col-span-1"
      >
        {total > 0 && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div
              className={cn('h-full rounded-full transition-[width] duration-500',
                collectionRate >= 70 ? 'bg-success' : collectionRate >= 40 ? 'bg-warning' : 'bg-destructive')}
              style={{ width: `${collectionRate}%` }}
            />
          </div>
        )}
      </FigureTile>
    </FigureTileGrid>
  );
};

export default InvoiceSummaryCards;
