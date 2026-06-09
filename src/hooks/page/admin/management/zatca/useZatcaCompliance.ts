/**
 * useZatcaCompliance — Onboard / Renew / TestConnection
 * مفصول عن useZatcaForm. يستقبل formData + setFormData + saveFirst.
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { zatcaOnboard, zatcaRenew, zatcaTestConnection, clearZatcaOtp } from '@/lib/services';
import { uiNotify } from '@/lib/notify';
import { appSettingsKeys } from '@/lib/queryKeys/appSettingsKeys';
import { zatcaKeys } from '@/lib/queryKeys/zatcaKeys';

export type ConnectionTestResult = {
  loading: boolean;
  result: null | { connected: boolean; url?: string; error?: string; tested_at?: string; status_code?: number };
};

interface Params {
  formData: Record<string, string>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saveFirst: () => Promise<boolean>;
}

export function useZatcaCompliance({ formData, setFormData, saveFirst }: Params) {
  const queryClient = useQueryClient();
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [renewLoading, setRenewLoading] = useState(false);
  const [connectionTest, setConnectionTest] = useState<ConnectionTestResult>({ loading: false, result: null });

  const clearOtpAfter = async () => {
    try {
      await clearZatcaOtp();
      setFormData(prev => ({ ...prev, zatca_otp_1: '', zatca_otp_2: '' }));
      queryClient.invalidateQueries({ queryKey: appSettingsKeys.byCategory('zatca') });
      queryClient.invalidateQueries({ queryKey: appSettingsKeys.prefixes.all });
    } catch { /* صمت */ }
  };

  const handleSetupAndOnboard = async () => {
    const requiredFields = [
      { key: 'vat_registration_number', label: 'الرقم الضريبي' },
      { key: 'zatca_device_serial', label: 'معرّف الجهاز' },
    ];
    const missing = requiredFields.filter(f => !formData[f.key]?.trim());
    if (missing.length > 0) {
      uiNotify.error(`يجب تعيين: ${missing.map(f => f.label).join('، ')}`);
      return;
    }
    if (!formData.zatca_otp_1?.trim()) {
      uiNotify.error('رمز التفعيل OTP الأول مطلوب لبدء التهيئة');
      return;
    }

    setOnboardLoading(true);
    try {
      const ok = await saveFirst();
      if (!ok) return;
      await zatcaOnboard();
      uiNotify.success('تم التسجيل بنجاح في بوابة فاتورة');
      queryClient.invalidateQueries({ queryKey: zatcaKeys.prefixes.certificates });
      queryClient.invalidateQueries({ queryKey: zatcaKeys.prefixes.operationLog });
    } catch (e) {
      uiNotify.error(e instanceof Error ? e.message : 'فشل التسجيل');
    } finally {
      setOnboardLoading(false);
      await clearOtpAfter();
    }
  };

  const handleRenewCertificate = async () => {
    const otp = formData.zatca_otp_2?.trim() || formData.zatca_otp_1?.trim();
    if (!otp) {
      uiNotify.error('رمز التفعيل OTP مطلوب للتجديد');
      return;
    }

    setRenewLoading(true);
    try {
      const ok = await saveFirst();
      if (!ok) return;
      const data = await zatcaRenew();
      if (data?.success) {
        uiNotify.success('تم تجديد شهادة الإنتاج بنجاح');
      } else {
        throw new Error(data?.error || 'فشل التجديد');
      }
      queryClient.invalidateQueries({ queryKey: zatcaKeys.prefixes.certificates });
      queryClient.invalidateQueries({ queryKey: zatcaKeys.prefixes.operationLog });
    } catch (e) {
      uiNotify.error(e instanceof Error ? e.message : 'فشل تجديد الشهادة');
    } finally {
      setRenewLoading(false);
      await clearOtpAfter();
    }
  };

  const handleTestConnection = async () => {
    setConnectionTest({ loading: true, result: null });
    try {
      const data = await zatcaTestConnection();
      setConnectionTest({ loading: false, result: data });
      queryClient.invalidateQueries({ queryKey: zatcaKeys.prefixes.operationLog });
      if (data?.connected) {
        uiNotify.success('✅ الاتصال ببوابة فاتورة ناجح');
      } else {
        uiNotify.error('❌ تعذّر الاتصال ببوابة فاتورة');
      }
    } catch (e) {
      setConnectionTest({
        loading: false,
        result: { connected: false, error: e instanceof Error ? e.message : 'خطأ غير معروف' },
      });
      uiNotify.error('فشل اختبار الاتصال');
    }
  };

  return {
    onboardLoading, renewLoading, connectionTest,
    handleSetupAndOnboard, handleRenewCertificate, handleTestConnection,
  };
}
