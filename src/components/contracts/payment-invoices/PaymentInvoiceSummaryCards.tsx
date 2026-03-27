/**
 * بطاقات ملخص فواتير الدفعات + شريط التحصيل
 */
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Receipt, TrendingUp, TrendingDown, FileWarning } from 'lucide-react';
import { fmt } from '@/utils/format';

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

export default function PaymentInvoiceSummaryCards({ summary }: PaymentInvoiceSummaryCardsProps) {
  const cards = [
    { icon: Receipt, color: 'primary', label: 'إجمالي الفواتير', value: summary.total, sub: `${fmt(summary.totalAmount)} ر.س` },
    { icon: TrendingUp, color: 'success', label: 'مسددة', value: summary.paid, sub: `${fmt(summary.paidAmount)} ر.س` },
    { icon: TrendingDown, color: 'destructive', label: 'متأخرة', value: summary.overdue, sub: `${fmt(summary.overdueAmount)} ر.س` },
    { icon: FileWarning, color: 'warning', label: 'نسبة التحصيل', value: `${summary.collectionRate.toFixed(0)}%`, sub: undefined },
  ];

  return (
    <>
      {/* بطاقات الملخص */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(({ icon: Icon, color, label, value, sub }) => (
          <Card key={label} className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-${color}/10 flex items-center justify-center`}>
                <Icon className={`w-5 h-5 text-${color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-lg font-bold ${color !== 'primary' && color !== 'warning' ? `text-${color}` : ''}`}>{value}</p>
                {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* شريط التحصيل */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">تقدم التحصيل</span>
            <span className="text-sm text-muted-foreground">
              {summary.paid} مسددة من {summary.total} فاتورة
              {summary.overdue > 0 && <span className="text-destructive mr-2">• {summary.overdue} متأخرة</span>}
            </span>
          </div>
          <Progress
            value={summary.collectionRate}
            className={`h-3 ${
              summary.collectionRate >= 80 ? '[&>div]:bg-success' :
              summary.collectionRate >= 50 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'
            }`}
          />
        </CardContent>
      </Card>
    </>
  );
}
