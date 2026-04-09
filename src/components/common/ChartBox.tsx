/**
 * ChartBox — حاوية رسم بياني موحّدة مع useChartReady
 * تؤجل عرض المحتوى حتى تصبح الحاوية جاهزة (مقاسات محسوبة)
 */
import type { ReactNode } from 'react';
import { useChartReady } from '@/hooks/ui/useChartReady';
import { cn } from '@/lib/cn';

interface ChartBoxProps {
  /** ارتفاع الحاوية — رقم (px) أو سلسلة نصية (CSS class أو clamp) */
  height?: number | string;
  /** className إضافي */
  className?: string;
  /** نص بديل أثناء التحميل */
  fallback?: string;
  children: ReactNode;
}

const ChartBox = ({ height = 300, className, fallback, children }: ChartBoxProps) => {
  const { ref, ready } = useChartReady();

  // تحديد نوع الارتفاع
  const isNumeric = typeof height === 'number';
  // إذا كانت string تحتوي على class tailwind (مثل h-[300px]) → className
  // إذا كانت string تحتوي على CSS value (مثل clamp(...)) → style
  const isCssValue = !isNumeric && typeof height === 'string' && !height.startsWith('h-');

  return (
    <div
      ref={ref}
      className={cn('min-w-0 min-h-[1px]', !isNumeric && !isCssValue && height, className)}
      style={isNumeric ? { height } : isCssValue ? { height } : undefined}
    >
      {ready
        ? children
        : fallback
          ? <div className="h-full flex items-center justify-center text-muted-foreground">{fallback}</div>
          : null}
    </div>
  );
};

export default ChartBox;
