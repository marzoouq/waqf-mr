import { usePrint } from '@/hooks/ui/usePrint';
import { CLEANUP_REPORT } from '@/constants/cleanupReport';

/**
 * Page hook لصفحة تقرير التنظيف — يُغلّف usePrint ويُرجع snapshot التقرير
 */
export function useCleanupReportPage() {
  const handlePrint = usePrint();
  return {
    report: CLEANUP_REPORT,
    handlePrint,
  };
}
