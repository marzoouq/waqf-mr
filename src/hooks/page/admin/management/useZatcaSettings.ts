/**
 * useZatcaSettings — Page hook composer
 * يجمع: useZatcaForm + useZatcaCompliance + useZatcaCertExpiry
 * الواجهة العامة محفوظة دون تغيير لمستهلكي ZatcaSettingsTab.
 */
import { useZatcaForm, ZATCA_KEYS } from './zatca/useZatcaForm';
import { useZatcaCompliance, type ConnectionTestResult } from './zatca/useZatcaCompliance';
import { useZatcaCertExpiry } from './zatca/useZatcaCertExpiry';

export { ZATCA_KEYS };
export type { ConnectionTestResult };

export const useZatcaSettings = () => {
  const { isLoading, formData, setFormData, saving, handleSave } = useZatcaForm();
  const { activeCert, certExpiryWarning } = useZatcaCertExpiry();
  const {
    onboardLoading, renewLoading, connectionTest,
    handleSetupAndOnboard, handleRenewCertificate, handleTestConnection,
  } = useZatcaCompliance({ formData, setFormData, saveFirst: handleSave });

  const isEnabled = formData.zatca_enabled === 'true';
  const selectedPhase = formData.zatca_phase || 'phase2';
  // الافتراضي 'sandbox' ليطابق مصدر الحقيقة في الخلفية (`resolveZatcaTarget`).
  // يمنع تضليل الناظر بإظهار "production" بينما الخلفية تنفّذ على sandbox.
  const selectedPlatform = formData.zatca_platform || 'sandbox';

  return {
    isLoading, formData, setFormData, saving, onboardLoading, renewLoading,
    connectionTest, activeCert, isEnabled, selectedPhase, selectedPlatform,
    certExpiryWarning,
    handleSave, handleSetupAndOnboard, handleRenewCertificate, handleTestConnection,
  };
};
