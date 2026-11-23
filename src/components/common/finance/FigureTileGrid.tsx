/**
 * شبكة بطاقات الأرقام الموحّدة + هيكل التحميل الخاص بها (الهوية الوقفية).
 * presentational فقط — لا حساب ولا جلب بيانات.
 */
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';

interface FigureTileGridProps {
  /** فئات الأعمدة على الشاشات الأوسع، مثل `lg:grid-cols-4` */
  cols?: string;
  isLoading?: boolean;
  /** عدد البطاقات الوهمية أثناء التحميل */
  skeletonCount?: number;
  className?: string;
  children?: ReactNode;
}

const FigureTileGrid = ({ cols = 'lg:grid-cols-4', isLoading, skeletonCount = 4, className, children }: FigureTileGridProps) => (
  <div className={cn('grid grid-cols-2 gap-3 sm:gap-4', cols, className)} aria-busy={isLoading || undefined}>
    {isLoading
      ? Array.from({ length: skeletonCount }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)
      : children}
  </div>
);

export default FigureTileGrid;
