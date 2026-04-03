/**
 * VirtualTable — جدول بتمرير افتراضي للبيانات الكبيرة
 * يعرض فقط الصفوف المرئية في نافذة العرض لتحسين الأداء
 * يُفعَّل تلقائياً عند تجاوز العدد الأدنى (VIRTUAL_THRESHOLD)
 */
import { useRef, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Table, TableHeader, TableBody, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

/** الحد الأدنى لتفعيل التمرير الافتراضي */
const VIRTUAL_THRESHOLD = 50;
/** ارتفاع الصف الافتراضي بالبكسل */
const DEFAULT_ROW_HEIGHT = 48;

interface VirtualTableProps<T> {
  /** بيانات الصفوف */
  data: T[];
  /** ارتفاع الحاوية بالبكسل */
  height?: number;
  /** ارتفاع الصف التقديري بالبكسل */
  estimateSize?: number;
  /** ترويسة الجدول */
  header: ReactNode;
  /** دالة رسم كل صف */
  renderRow: (item: T, index: number) => ReactNode;
  /** معرّف فريد لكل عنصر */
  getKey: (item: T) => string;
  /** className إضافي للحاوية */
  className?: string;
  /** الحد الأدنى لتفعيل الافتراضي (افتراضي: 50) */
  threshold?: number;
  /** تسمية الجدول لقراءات الشاشة */
  ariaLabel?: string;
}

export default function VirtualTable<T>({
  data,
  height = 600,
  estimateSize = DEFAULT_ROW_HEIGHT,
  header,
  renderRow,
  getKey,
  className,
  threshold = VIRTUAL_THRESHOLD,
  ariaLabel,
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  // إذا كانت البيانات أقل من الحد → جدول عادي بدون تمرير افتراضي
  if (data.length < threshold) {
    return (
      <Table className={className} aria-label={ariaLabel}>
        {header}
        <TableBody>
          {data.map((item, i) => renderRow(item, i))}
        </TableBody>
      </Table>
    );
  }

  return (
    <VirtualTableInner
      data={data}
      height={height}
      estimateSize={estimateSize}
      header={header}
      renderRow={renderRow}
      getKey={getKey}
      className={className}
      parentRef={parentRef}
      ariaLabel={ariaLabel}
    />
  );
}

/** المكوّن الداخلي — يستخدم الـ virtualizer */
function VirtualTableInner<T>({
  data,
  height,
  estimateSize,
  header,
  renderRow,
  getKey,
  className,
  parentRef,
  ariaLabel,
}: Omit<VirtualTableProps<T>, 'threshold'> & {
  parentRef: React.RefObject<HTMLDivElement | null>;
}) {
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize!,
    overscan: 10,
  });

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto', className)}
      style={{ height, contain: 'strict' }}
    >
      <Table aria-label={ariaLabel}>
        {header}
        <TableBody>
          {/* فراغ علوي للصفوف غير المرئية */}
          {virtualizer.getVirtualItems().length > 0 && (
            <TableRow style={{ height: virtualizer.getVirtualItems()[0]?.start ?? 0 }} aria-hidden>
              <td colSpan={100} className="p-0 border-0" />
            </TableRow>
          )}

          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = data[virtualRow.index]!;
            return renderRow(item, virtualRow.index);
          })}

          {/* فراغ سفلي للصفوف غير المرئية */}
          {virtualizer.getVirtualItems().length > 0 && (
            <TableRow
              style={{
                height:
                  virtualizer.getTotalSize() -
                  (virtualizer.getVirtualItems().at(-1)?.end ?? 0),
              }}
              aria-hidden
            >
              <td colSpan={100} className="p-0 border-0" />
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
