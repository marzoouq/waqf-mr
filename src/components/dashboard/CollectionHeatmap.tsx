/**
 * D-4: خريطة حرارية للتحصيل الشهري — 12 شهر × شدة اللون
 * تعرض المبالغ المحصّلة فعلياً (فواتير مدفوعة) شهرياً بتدرج لوني يعكس حجم التحصيل
 * BUG-M1 fix: تستخدم paymentInvoices (تحصيل فعلي) بدلاً من income (مدخلات محاسبية)
 * H-01 fix: تستخدم fiscalYear لتحديد الأشهر المعروضة بدلاً من تجميع كل السنوات
 */
import { useMemo } from 'react';
import { safeNumber } from '@/utils/safeNumber';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Flame } from 'lucide-react';

interface PaymentInvoice {
  paid_date?: string | null;
  paid_amount?: number | null;
  amount: number;
  status: string;
}

interface CollectionHeatmapProps {
  paymentInvoices: PaymentInvoice[];
  /** بداية السنة المالية — لتحديد نطاق الأشهر المعروضة */
  fiscalYearStart?: string | null;
  /** نهاية السنة المالية */
  fiscalYearEnd?: string | null;
}

const MONTH_LABELS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

/** حساب كثافة اللون (0-4) بناءً على النسبة من الحد الأقصى */
const getIntensity = (value: number, max: number): number => {
  if (max === 0 || value === 0) return 0;
  const ratio = value / max;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
};

const INTENSITY_CLASSES: Record<number, string> = {
  0: 'bg-muted/30 text-muted-foreground',
  1: 'bg-success/20 text-success',
  2: 'bg-success/40 text-success',
  3: 'bg-success/60 text-success-foreground',
  4: 'bg-success/90 text-success-foreground',
};

// H-02: تنسيق k بدقة — toFixed(1) بدل toFixed(0)
const formatCompactAmount = (amount: number): string => {
  if (amount === 0) return '—';
  if (amount >= 1000) return `${(amount / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return amount.toLocaleString('ar-SA');
};

const CollectionHeatmap = ({ paymentInvoices, fiscalYearStart, fiscalYearEnd }: CollectionHeatmapProps) => {
  // H-01 fix: تحديد نطاق السنة المالية لفلترة الأشهر
  const yearRange = useMemo(() => {
    if (fiscalYearStart && fiscalYearEnd) {
      return {
        startYear: new Date(fiscalYearStart).getFullYear(),
        endYear: new Date(fiscalYearEnd).getFullYear(),
      };
    }
    return null;
  }, [fiscalYearStart, fiscalYearEnd]);

  // H-01 fix: تجميع التحصيل الفعلي حسب الشهر مع فلترة بالسنة المالية
  const monthlyAmounts = useMemo(() => {
    const amounts = new Array(12).fill(0);
    paymentInvoices.forEach(inv => {
      if (inv.status !== 'paid' && inv.status !== 'partially_paid') return;
      const dateStr = inv.paid_date;
      if (!dateStr) return;
      const dateObj = new Date(dateStr);
      const year = dateObj.getFullYear();

      // H-01: فلترة بالسنة المالية — تجاهل الفواتير خارج النطاق
      if (yearRange) {
        if (year < yearRange.startYear || year > yearRange.endYear) return;
      }

      const month = dateObj.getMonth();
      const collected = inv.status === 'partially_paid'
        ? safeNumber(inv.paid_amount)
        : safeNumber(inv.amount);
      amounts[month] += collected;
    });
    return amounts;
  }, [paymentInvoices, yearRange]);

  const maxAmount = useMemo(() => Math.max(...monthlyAmounts, 1), [monthlyAmounts]);
  const totalCollected = monthlyAmounts.reduce((s, v) => s + v, 0);

  // H-04: تحديد الشهر الحالي
  const currentMonth = new Date().getMonth();

  if (totalCollected === 0) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Flame className="w-5 h-5 text-primary" />
          خريطة التحصيل الشهري
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
            {MONTH_LABELS.map((label, i) => {
              const amount = monthlyAmounts[i];
              const intensity = getIntensity(amount, maxAmount);
              // H-04: تمييز الشهر الحالي بحلقة بارزة
              const isCurrentMonth = i === currentMonth;
              return (
                <Tooltip key={`month-${i}`}>
                  <TooltipTrigger asChild>
                    <div
                      className={`rounded-lg p-2 sm:p-3 text-center cursor-default transition-colors ${INTENSITY_CLASSES[intensity]} ${isCurrentMonth ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}`}
                    >
                      <p className="text-[10px] sm:text-xs font-medium truncate">{label}</p>
                      <p className="text-xs sm:text-sm font-bold mt-1 tabular-nums">
                        {formatCompactAmount(amount)}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="font-medium">{label}: {amount.toLocaleString('ar-SA')} ر.س</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        {/* مفتاح التدرج */}
        <div className="flex items-center gap-2 mt-4 justify-center text-xs text-muted-foreground">
          <span>أقل</span>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={`legend-${i}`} className={`w-5 h-5 rounded ${INTENSITY_CLASSES[i]}`} />
          ))}
          <span>أكثر</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default CollectionHeatmap;
