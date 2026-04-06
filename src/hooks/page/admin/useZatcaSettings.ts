/**
 * هوك إدارة إعدادات ZATCA
 */
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';
import { useZatcaCertificates } from '@/hooks/data/zatca/useZatcaCertificates';
import { zatcaOnboard, zatcaRenew, zatcaTestConnection, clearZatcaOtp, saveZatcaSettings } from '@/lib/services';
import { defaultNotify } from '@/lib/notify';

export const ZATCA_KEYS = [
  'vat_registration_number',
  'commercial_registration_number',
  'business_address_street',
  'business_address_city',
  'business_address_postal_code',
  'business_address_district',
  'business_address_building',
  'default_vat_rate',
  'zatca_device_serial',
  'zatca_enabled',
  'zatca_phase',
  'zatca_platform',
  'zatca_branch_name',
  'zatca_activity_code',
  'zatca_otp_1',
  'zatca_otp_2',
  'waqf_bank_name',
  'waqf_bank_account',
  'waqf_bank_iban',
] as const;

const DEVICE_SERIAL_REGEX = /^1-.+\|2-.+\|3-.+$/;

export type ConnectionTestResult = {
  loading: boolean;
  result: null | { connected: boolean; url?: string; error?: string; tested_at?: string; status_code?: number };
};

export const useZatcaSettings = () => {
  const { data: settings, isLoading } = useAppSettings();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [renewLoading, setRenewLoading] = useState(false);
  const [connectionTest, setConnectionTest] = useState<ConnectionTestResult>({ loading: false, result: null });

  const { data: certificates = [] } = useZatcaCertificates();

  const activeCert = certificates.find(c => c.is_active);

  const certExpiryWarning = (() => {
    if (!activeCert?.expires_at) return null;
    const expiresAt = new Date(activeCert.expires_at);
    const now = new Date();
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { daysLeft, level: 'expired' as const, message: 'شهادة ZATCA منتهية الصلاحية. يجب تجديدها فوراً.' };
    if (daysLeft <= 14) return { daysLeft, level: 'critical' as const, message: `شهادة ZATCA ستنتهي خلال ${daysLeft} يوماً. يُرجى تجديدها.` };
    if (daysLeft <= 30) return { daysLeft, level: 'warning' as const, message: `شهادة ZATCA ستنتهي خلال ${daysLeft} يوماً.` };
    return null;
  })();

  const isEnabled = formData.zatca_enabled === 'true';
  const selectedPhase = formData.zatca_phase || 'phase2';
  const selectedPlatform = formData.zatca_platform || 'production';

  useEffect(() => {
    if (settings) {
      const initial: Record<string, string> = {};
      for (const key of ZATCA_KEYS) {
        initial[key] = settings[key] || '';
      }
      setFormData(initial);
    }
  }, [settings]);

  const handleSave = async () => {
    const vatNum = formData.vat_registration_number?.trim();
    if (vatNum && vatNum.length > 0) {
      if (!/^\d{15}$/.test(vatNum)) {
        defaultNotify.error('الرقم الضريبي يجب أن يكون 15 رقماً');
        return;
      }
      if (!vatNum.startsWith('3') || !vatNum.endsWith('3')) {
        defaultNotify.error('الرقم الضريبي يجب أن يبدأ وينتهي بالرقم 3');
        return;
      }
    }

    const serial = formData.zatca_device_serial?.trim();
    if (serial && serial.length > 0 && !DEVICE_SERIAL_REGEX.test(serial)) {
      defaultNotify.error('صيغة معرّف الجهاز غير صحيحة. الصيغة المطلوبة: 1-XXX|2-YYY|3-ZZZ');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const rows = ZATCA_KEYS.map((key) => ({
        key,
        value: (formData[key] || '').trim(),
        updated_at: now,
      }));
      await saveZatcaSettings(rows);
      queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
      defaultNotify.success('تم حفظ إعدادات الضريبة بنجاح');
    } catch {
      defaultNotify.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleSetupAndOnboard = async () => {
    const requiredFields: { key: string; label: string }[] = [
      { key: 'vat_registration_number', label: 'الرقم الضريبي' },
      { key: 'zatca_device_serial', label: 'معرّف الجهاز' },
    ];
    const missing = requiredFields.filter(f => !formData[f.key]?.trim());
    if (missing.length > 0) {
      defaultNotify.error(`يجب تعيين: ${missing.map(f => f.label).join('، ')}`);
      return;
    }
    const otp1 = formData.zatca_otp_1?.trim();
    if (!otp1) {
      defaultNotify.error('رمز التفعيل OTP الأول مطلوب لبدء التهيئة');
      return;
    }

    setOnboardLoading(true);
    try {
      await handleSave();
      await zatcaOnboard();
      defaultNotify.success('تم التسجيل بنجاح في بوابة فاتورة');
      queryClient.invalidateQueries({ queryKey: ['zatca-certificates'] });
      queryClient.invalidateQueries({ queryKey: ['zatca-operation-log'] });
    } catch (e) {
      defaultNotify.error(e instanceof Error ? e.message : 'فشل التسجيل');
    } finally {
      setOnboardLoading(false);
      try {
        await clearZatcaOtp();
        setFormData(prev => ({ ...prev, zatca_otp_1: '', zatca_otp_2: '' }));
        queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
      } catch { /* صمت */ }
    }
  };

  const handleRenewCertificate = async () => {
    const otp = formData.zatca_otp_2?.trim() || formData.zatca_otp_1?.trim();
    if (!otp) {
      defaultNotify.error('رمز التفعيل OTP مطلوب للتجديد');
      return;
    }

    setRenewLoading(true);
    try {
      await handleSave();
      const data = await zatcaRenew();
      if (data?.success) {
        defaultNotify.success('تم تجديد شهادة الإنتاج بنجاح');
      } else {
        throw new Error(data?.error || 'فشل التجديد');
      }
      queryClient.invalidateQueries({ queryKey: ['zatca-certificates'] });
      queryClient.invalidateQueries({ queryKey: ['zatca-operation-log'] });
    } catch (e) {
      defaultNotify.error(e instanceof Error ? e.message : 'فشل تجديد الشهادة');
    } finally {
      setRenewLoading(false);
      try {
        await clearZatcaOtp();
        setFormData(prev => ({ ...prev, zatca_otp_1: '', zatca_otp_2: '' }));
        queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
      } catch { /* صمت */ }
    }
  };

  const handleTestConnection = async () => {
    setConnectionTest({ loading: true, result: null });
    try {
      const data = await zatcaTestConnection();
      setConnectionTest({ loading: false, result: data });
      queryClient.invalidateQueries({ queryKey: ['zatca-operation-log'] });
      if (data?.connected) {
        defaultNotify.success('✅ الاتصال ببوابة فاتورة ناجح');
      } else {
        defaultNotify.error('❌ تعذّر الاتصال ببوابة فاتورة');
      }
    } catch (e) {
      setConnectionTest({
        loading: false,
        result: { connected: false, error: e instanceof Error ? e.message : 'خطأ غير معروف' },
      });
      defaultNotify.error('فشل اختبار الاتصال');
    }
  };

  return {
    isLoading, formData, setFormData, saving, onboardLoading, renewLoading,
    connectionTest, activeCert, isEnabled, selectedPhase, selectedPlatform,
    certExpiryWarning,
    handleSave, handleSetupAndOnboard, handleRenewCertificate, handleTestConnection,
  };
};
