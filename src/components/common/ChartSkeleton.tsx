/**
 * هيكل تحميل الرسوم البيانية — مكوّن مشترك
 */
import { Skeleton } from '@/components/ui/skeleton';

const ChartSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Skeleton className="h-[300px] w-full rounded-lg" />
    <Skeleton className="h-[300px] w-full rounded-lg" />
  </div>
);

export default ChartSkeleton;
