/**
 * useZatcaForm — حالة نموذج إعدادات ZATCA + الحفظ
 * يستخرج formData/save من useZatcaSettings الأصلي.
 */
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppSettings } from '@/hooks/data/settings/app/useAppSettings';
import { saveZatcaSettings } from '@/lib/services';
import { uiNotify } from '@/lib/notify';
import { validateZatcaSettingsForm } from '@/utils/zatca/validateZatcaForm';

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

export function useZatcaForm() {
  const { data: settings, isLoading } = useAppSettings();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      const initial: Record<string, string> = {};
      for (const key of ZATCA_KEYS) {
        initial[key] = settings[key] || '';
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- تهيئة form من useAppSettings (مصدر خارجي)
      setFormData(initial);
    }
  }, [settings]);

  const handleSave = async (): Promise<boolean> => {
    const validation = validateZatcaSettingsForm(formData);
    if (!validation.ok) {
      uiNotify.error(validation.reason);
      return false;
    }
    setSaving(true);
    try {
      const rows = ZATCA_KEYS.map((key) => ({ key, value: (formData[key] || '').trim() }));
      await saveZatcaSettings(rows);
      queryClient.invalidateQueries({ queryKey: ['app-settings', 'zatca'] });
      queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
      uiNotify.success('تم حفظ إعدادات الضريبة بنجاح');
      return true;
    } catch {
      uiNotify.error(SAVE_MESSAGES.saveError);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { isLoading, formData, setFormData, saving, handleSave };
}
