import { usePrint } from '@/hooks/ui/usePrint';
import { AUDIT_B_FINDINGS, AUDIT_ROUND_META } from '@/constants/auditFindings';
import { AUDIT_STATUS_LABELS } from '@/constants/auditFindings';
import { usePdfWaqfInfo } from '@/hooks/data/settings/waqf/usePdfWaqfInfo';
import { uiNotify } from '@/lib/notify';

/**
 * Page hook لصفحة تقرير التدقيق النهائي — يُغلّف usePrint ويُرجع بيانات التقرير
 */
export function useAuditReportFinalPage() {
  const print = usePrint();
  const waqfInfo = usePdfWaqfInfo();
  const handlePrint = async () => {
    try {
      const { generateSummaryPdf } = await import('@/utils/pdf/reports/summaryPdf');
      await generateSummaryPdf({
        title: AUDIT_ROUND_META.scope, subtitle: AUDIT_ROUND_META.date, filename: 'audit-report-final.pdf',
        rows: AUDIT_B_FINDINGS.map(f => [`${f.id} — ${f.title} — ${AUDIT_STATUS_LABELS[f.status]}`, f.rationale]),
      }, waqfInfo);
    } catch { uiNotify.error('تعذّر إصدار تقرير التدقيق'); }
  };
  return {
    findings: AUDIT_B_FINDINGS,
    meta: AUDIT_ROUND_META,
    handlePrint,
    print,
  };
}
