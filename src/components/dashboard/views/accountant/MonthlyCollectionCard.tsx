/**
 * MonthlyCollectionCard — بطاقة التحصيل الشهري (آخر 6 أشهر)
 * مستخرجة من AccountantDashboardView (موجة 17).
 */
import { memo } from 'react';
import { CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { fmtInt } from '@/utils/format/format';
import { cn } from '@/lib/cn';
import type { AccountantMetrics } from '@/hooks/page/admin/dashboard/useAccountantDashboardData';

/**
 * #A4 — Tailwind JIT لا يكتشف classes مُولّدة عبر interpolation.
 * يجب استخدام classes كاملة ثابتة حتى يلتقطها الـ scanner.
 */
const PROGRESS_BAR_CLASS = {
  success: '[&>div]:bg-success',
  warning: '[&>div]:bg-warning',
  destructive: '[&>div]:bg-destructive',
} as const;

const getProgressTone = (rate: number): keyof typeof PROGRESS_BAR_CLASS =>
  rate >= 80 ? 'success' : rate >= 50 ? 'warning' : 'destructive';

interface MonthlyCollectionCardProps {
  data: AccountantMetrics['monthlyCollection'];
}

const MonthlyCollectionCard = memo(function MonthlyCollectionCard({ data }: MonthlyCollectionCardProps) {
  if (!data.length) return null;

  // آخر 6 أشهر فقط
  const recent = data.slice(-6);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5" />
          ملخص التحصيل الشهري
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recent.map(item => {
            const tone = getProgressTone(item.rate);
            const textColor =
              tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-destructive';
            return (
              <div key={item.month} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">{item.month}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {fmtInt(item.collected)} / {fmtInt(item.expected)} ر.س
                    </span>
                    <span className={`font-bold ${textColor}`}>{item.rate}%</span>
                  </div>
                </div>
                <Progress value={item.rate} className={cn('h-2', PROGRESS_BAR_CLASS[tone])} />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});

export default MonthlyCollectionCard;
