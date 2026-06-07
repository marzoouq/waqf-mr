import { usePrint } from '@/hooks/ui/usePrint';
import { AUDIT_B_FINDINGS, AUDIT_ROUND_META } from '@/constants/auditFindings';

/**
 * Page hook لصفحة تقرير التدقيق النهائي — يُغلّف usePrint ويُرجع بيانات التقرير
 */
export function useAuditReportFinalPage() {
  const handlePrint = usePrint();
  return {
    findings: AUDIT_B_FINDINGS,
    meta: AUDIT_ROUND_META,
    handlePrint,
  };
}
