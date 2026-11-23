/**
 * بطاقات ملخص فواتير الدفعات + شريط التحصيل (الهوية الوقفية) — الأرقام كما تصل.
 */
import { CheckCircle2, AlertTriangle, Percent } from 'lucide-react';
import { FigureTile, FigureTileGrid, ProgressSummaryBar } from '@/components/common';
import { DOMAIN_ICONS } from '@/constants/domainIcons';
import { fmt } from '@/utils/format/format';

interface SummaryData {
  total: number;
  totalAmount: number;
  paid: number;
  paidAmount: number;
  overdue: number;
  overdueAmount: number;
  collectionRate: number;
}

interface PaymentInvoiceSummaryCardsProps {
  summary: SummaryData;
}

const Sar = ({ value }: { value: number }) => <><bdi dir="ltr" className="num">{fmt(value)}</bdi> ر.س</>;

export default function PaymentInvoiceSummaryCards({ summary }: PaymentInvoiceSummaryCardsProps) {
  return (
    <>
      <FigureTileGrid>
        <FigureTile label="إجمالي الفواتير" value={summary.total} unit="count" icon={DOMAIN_ICONS.invoice} hint={<Sar value={summary.totalAmount} />} />
        <FigureTile label="مسددة" value={summary.paid} unit="count" icon={CheckCircle2} tone="success" hint={<Sar value={summary.paidAmount} />} />
        <FigureTile
          label="متأخرة" value={summary.overdue} unit="count" icon={AlertTriangle}
          tone={summary.overdue > 0 ? 'expense' : 'neutral'} hint={<Sar value={summary.overdueAmount} />}
        />
        <FigureTile label="نسبة التحصيل" value={`${summary.collectionRate.toFixed(0)}%`} unit="percent" icon={Percent} tone="share" />
      </FigureTileGrid>

      <ProgressSummaryBar
        label="تقدم التحصيل" rate={summary.collectionRate}
        meta={<>
          <bdi dir="ltr" className="num">{summary.paid}</bdi> مسددة من <bdi dir="ltr" className="num">{summary.total}</bdi> فاتورة
          {summary.overdue > 0 && <span className="text-destructive ms-2">• <bdi dir="ltr" className="num">{summary.overdue}</bdi> متأخرة</span>}
        </>}
      />
    </>
  );
}
