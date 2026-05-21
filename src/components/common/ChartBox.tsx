/**
 * ChartBox — حاوية رسم بياني موحّدة
 * نضمن ارتفاع وعرض ثابتين حتى يتمكن ResponsiveContainer من القياس فوراً
 * دون الحاجة لانتظار ResizeObserver (الذي قد لا يطلق داخل Suspense/lazy).
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface ChartBoxProps {
  /** ارتفاع الحاوية — رقم (px) أو سلسلة نصية (CSS class أو clamp) */
  height?: number | string;
  /** className إضافي */
  className?: string;
  /** نص بديل (غير مستخدم — للتوافق العكسي) */
  fallback?: string;
  children: ReactNode;
}

const ChartBox = ({ height = 300, className, children }: ChartBoxProps) => {
  const isNumeric = typeof height === 'number';
  const isCssValue = !isNumeric && typeof height === 'string' && !height.startsWith('h-');

  return (
    <div
      className={cn('w-full min-w-0', !isNumeric && !isCssValue && height, className)}
      style={isNumeric ? { height, width: '100%' } : isCssValue ? { height, width: '100%' } : { width: '100%' }}
    >
      {children}
    </div>
  );
};

export default ChartBox;
