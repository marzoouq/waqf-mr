/**
 * هوك صفحة إدارة ZATCA — يفصل منطق الحالة عن الواجهة
 */
import { useState, useCallback } from 'react';
import { useZatcaManagement } from '@/hooks/data/zatca/useZatcaManagement';
import type { ComplianceResult } from '@/types/zatca';

export function useZatcaManagementPage() {
  const z = useZatcaManagement();
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);

  const runComplianceCheck = useCallback((invoiceId: string, table: string) => {
    z.complianceCheck.mutate(
      { invoiceId, table },
      { onSuccess: (data) => setComplianceResult(data as ComplianceResult) }
    );
  }, [z.complianceCheck]);

  const clearComplianceResult = useCallback(() => setComplianceResult(null), []);

  return { z, complianceResult, runComplianceCheck, clearComplianceResult };
}
