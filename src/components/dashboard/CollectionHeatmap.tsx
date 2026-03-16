/**
 * D-4: خريطة حرارية للتحصيل الشهري — 12 شهر × شدة اللون
 * تعرض المبالغ المحصّلة شهرياً بتدرج لوني يعكس حجم التحصيل
 */
import { useMemo } from 'react';
import { safeNumber } from '@/utils/safeNumber';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Flame } from 'lucide-react';

interface CollectionHeatmapProps {
  income: Array<{ date: string; amount: number }>;
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

const CollectionHeatmap = ({ income }: CollectionHeatmapProps) => {
  // تجميع الدخل حسب الشهر
  const monthlyAmounts = useMemo(() => {
    const amounts = new Array(12).fill(0);
    income.forEach(item => {
      const month = new Date(item.date).getMonth();
      amounts[month] += safeNumber(item.amount);
    });
    return amounts;
  }, [income]);

  const maxAmount = useMemo(() => Math.max(...monthlyAmounts, 1), [monthlyAmounts]);
  const totalCollected = monthlyAmounts.reduce((s, v) => s + v, 0);

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
              return (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <div
                      className={`rounded-lg p-2 sm:p-3 text-center cursor-default transition-colors ${INTENSITY_CLASSES[intensity]}`}
                    >
                      <p className="text-[10px] sm:text-xs font-medium truncate">{label}</p>
                      <p className="text-xs sm:text-sm font-bold mt-1 tabular-nums">
                        {amount > 0 ? (amount >= 1000 ? `${(amount / 1000).toFixed(0)}k` : amount.toLocaleString('ar-SA')) : '—'}
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
            <div key={i} className={`w-5 h-5 rounded ${INTENSITY_CLASSES[i]}`} />
          ))}
          <span>أكثر</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default CollectionHeatmap;
