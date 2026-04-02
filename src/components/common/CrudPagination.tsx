/**
 * مكوّن تصفح موحّد لجداول البيانات التي تستخدم useCrudFactory.
 * يعمل مع واجهة PaginatedQueryResult المُصدَّرة من المصنع.
 */
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export interface CrudPaginationProps {
  /** رقم الصفحة الحالية (يبدأ من 0) */
  page: number;
  /** حجم الصفحة */
  pageSize: number;
  /** عدد العناصر في الصفحة الحالية */
  currentCount: number;
  /** هل توجد صفحة تالية */
  hasNextPage: boolean;
  /** هل توجد صفحة سابقة */
  hasPrevPage: boolean;
  /** الانتقال إلى الصفحة التالية */
  nextPage: () => void;
  /** الانتقال إلى الصفحة السابقة */
  prevPage: () => void;
  /** هل البيانات قيد التحميل */
  isLoading?: boolean;
}

const CrudPagination = ({
  page,
  pageSize,
  currentCount,
  hasNextPage,
  hasPrevPage,
  nextPage,
  prevPage,
  isLoading = false,
}: CrudPaginationProps) => {
  // لا نعرض التصفح إذا كانت الصفحة الأولى ولا توجد صفحة تالية
  if (!hasPrevPage && !hasNextPage) return null;

  const start = page * pageSize + 1;
  const end = page * pageSize + currentCount;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-border">
      <p className="text-sm text-muted-foreground">
        عرض {start} - {end} {hasNextPage ? '+' : ''}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={prevPage}
          disabled={!hasPrevPage || isLoading}
          aria-label="الصفحة السابقة"
        >
          <ChevronRight className="w-4 h-4" />
          السابق
        </Button>
        <span className="text-sm text-muted-foreground min-w-[60px] text-center">
          صفحة {page + 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={nextPage}
          disabled={!hasNextPage || isLoading}
          aria-label="الصفحة التالية"
        >
          التالي
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default CrudPagination;
