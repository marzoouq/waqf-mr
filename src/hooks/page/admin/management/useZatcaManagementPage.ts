/**
 * هوك صفحة إدارة ZATCA — يفصل منطق الحالة عن الواجهة
 * يحتوي على كل toast الواجهة لأن hooks/data/zatca/* لا تحتوي على أي إشعارات
 */
import { useState, useCallback } from 'react';
import { useZatcaManagement } from '@/hooks/data/zatca/useZatcaManagement';
import { uiNotify } from '@/lib/notify';
import { getSafeErrorMessage } from '@/utils/format/safeErrorMessage';
import type { ComplianceResult } from '@/types/zatca';

export function useZatcaManagementPage() {
  const z = useZatcaManagement();
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);

  const generateXml = useCallback((invoiceId: string, table: string) => {
    z.generateXml.mutate(
      { invoiceId, table },
      {
        onSuccess: () => uiNotify.success('تم توليد XML بنجاح'),
        onError: (e: Error) => uiNotify.error(getSafeErrorMessage(e)),
      },
    );
  }, [z.generateXml]);

  const signInvoice = useCallback((invoiceId: string, table: string) => {
    z.signInvoice.mutate(
      { invoiceId, table },
      {
        onSuccess: () => uiNotify.success('تم التوقيع بنجاح'),
        onError: (e: Error) => uiNotify.error(getSafeErrorMessage(e)),
      },
    );
  }, [z.signInvoice]);

  const submitToZatca = useCallback((invoiceId: string, table: string, action: 'report' | 'clearance') => {
    z.submitToZatca.mutate(
      { invoiceId, table, action },
      {
        onSuccess: () => uiNotify.success('تم الإرسال لـ ZATCA'),
        onError: (e: Error) => uiNotify.error(getSafeErrorMessage(e)),
      },
    );
  }, [z.submitToZatca]);

  const runComplianceCheck = useCallback((invoiceId: string, table: string) => {
    z.complianceCheck.mutate(
      { invoiceId, table },
      {
        onSuccess: (data) => {
          const status = (data as ComplianceResult | undefined)?.validationResults?.status;
          if (status === 'PASS') uiNotify.success('✅ اجتاز فحص الامتثال');
          else if (status === 'WARNING') uiNotify.warning('⚠️ اجتاز مع تحذيرات');
          else uiNotify.error('❌ لم يجتز فحص الامتثال');
          setComplianceResult(data as ComplianceResult);
        },
        onError: (e: Error) => uiNotify.error(getSafeErrorMessage(e)),
      },
    );
  }, [z.complianceCheck]);

  const handleOnboard = useCallback(async () => {
    try {
      await z.handleOnboard();
      uiNotify.success('تم إرسال طلب التسجيل');
    } catch (e) {
      uiNotify.error(e instanceof Error ? e.message : 'فشل التسجيل');
    }
  }, [z]);

  const handleProductionUpgrade = useCallback(async () => {
    try {
      await z.handleProductionUpgrade();
      uiNotify.success('✅ تمت الترقية لشهادة الإنتاج بنجاح');
    } catch (e) {
      uiNotify.error(e instanceof Error ? e.message : 'فشلت الترقية للإنتاج');
    }
  }, [z]);

  const clearComplianceResult = useCallback(() => setComplianceResult(null), []);

  return {
    z,
    complianceResult,
    clearComplianceResult,
    runComplianceCheck,
    generateXml,
    signInvoice,
    submitToZatca,
    handleOnboard,
    handleProductionUpgrade,
  };
}
