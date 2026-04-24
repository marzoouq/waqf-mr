/**
 * بطاقات ملخص فواتير الدفعات + شريط التحصيل
 */
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Receipt, TrendingUp, TrendingDown, FileWarning, type LucideIcon } from 'lucide-react';
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

type Tone = 'primary' | 'success' | 'destructive' | 'warning';

/**
 * كلاسات ثابتة كاملة — Tailwind لا يستطيع تحليل interpolation ديناميكي (`bg-${x}/10`)
 * لذا نُعرّف الخريطة هنا حتى يضمن purge الإبقاء عليها في البناء النهائي.
 */
const TONE_CLASSES: Record<Tone, { bg: string; icon: string; value: string }> = {
  primary:     { bg: 'bg-primary/10',     icon: 'text-primary',     value: '' },
  success:     { bg: 'bg-success/10',     icon: 'text-success',     value: 'text-success' },
  destructive: { bg: 'bg-destructive/10', icon: 'text-destructive', value: 'text-destructive' },
  warning:     { bg: 'bg-warning/10',     icon: 'text-warning',     value: '' },
};

interface CardDef {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string | number;
  sub?: string;
}

export default function PaymentInvoiceSummaryCards({ summary }: PaymentInvoiceSummaryCardsProps) {
  const cards: CardDef[] = [
    { icon: Receipt,       tone: 'primary',     label: 'إجمالي الفواتير', value: summary.total,   sub: `${fmt(summary.totalAmount)} ر.س` },
    { icon: TrendingUp,    tone: 'success',     label: 'مسددة',           value: summary.paid,    sub: `${fmt(summary.paidAmount)} ر.س` },
    { icon: TrendingDown,  tone: 'destructive', label: 'متأخرة',          value: summary.overdue, sub: `${fmt(summary.overdueAmount)} ر.س` },
    { icon: FileWarning,   tone: 'warning',     label: 'نسبة التحصيل',    value: `${summary.collectionRate.toFixed(0)}%` },
  ];

  return (
    <>
      {/* بطاقات الملخص */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(({ icon: Icon, tone, label, value, sub }) => {
          const c = TONE_CLASSES[tone];
          return (
            <Card key={label} className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${c.icon}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-lg font-bold ${c.value}`}>{value}</p>
                  {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
                </div>
              </CardContent>
            </Card>
          );
        })}
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
