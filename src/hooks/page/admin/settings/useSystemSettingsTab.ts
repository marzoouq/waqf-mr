/**
 * Page hook: SystemSettingsTab
 */
import { useState, useEffect, useMemo } from 'react';
import { uiNotify } from '@/lib/notify';
import { useAppSettings } from '@/hooks/data/settings/app/useAppSettings';
import { useAppSettingsHistory, type AppSettingHistoryEntry } from '@/hooks/data/settings/app/useAppSettingsHistory';
import { SAVE_MESSAGES } from '@/lib/messages';

export interface AdvancedField {
  key: string;
  label: string;
  description: string;
  placeholder?: string;
}

export const ADVANCED_FIELDS: AdvancedField[] = [
  {
    key: 'auth_hook_custom_access_token',
    label: 'مُعالج JWT المخصص (Custom Access Token Hook)',
    description: 'تفعيل أو تعطيل إضافة بيانات الدور إلى الرمز المميز للمصادقة. القيمة المعتادة: enabled',
    placeholder: 'enabled',
  },
  {
    key: 'voucher_pdf_beneficiary_access',
    label: 'السماح للمستفيد/الواقف بتنزيل ملفات PDF لسندات الصرف',
    description: 'القيمة "true" تُتيح للمستفيد والواقف معاينة وتنزيل ملفات PDF للسندات المعتمدة (تحتوي بيانات شخصية للمستلمين). الافتراضي: false',
    placeholder: 'false',
  },
];

export type { AppSettingHistoryEntry };

export const useSystemSettingsTab = () => {
  const { data: settings, isLoading, updateSettingsBatch } = useAppSettings();
  const { data: history, isLoading: isHistoryLoading } = useAppSettingsHistory(undefined, 50);

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    const initial: Record<string, string> = {};
    ADVANCED_FIELDS.forEach((f) => {
      initial[f.key] = settings[f.key] ?? '';
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- تهيئة form من useAppSettings (مصدر خارجي)
    setFormData(initial);
  }, [settings]);

  const onFieldChange = (key: string, value: string) => {
    setFormData((p) => ({ ...p, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const rows = ADVANCED_FIELDS.map((f) => ({
        key: f.key,
        value: (formData[f.key] ?? '').trim(),
        updated_at: now,
      }));
      await updateSettingsBatch.mutateAsync(rows);
      uiNotify.success('تم حفظ الإعدادات بنجاح');
    } catch {
      uiNotify.error(SAVE_MESSAGES.saveError);
    } finally {
      setSaving(false);
    }
  };

  const sortedHistory = useMemo(() => history ?? [], [history]);

  return { formData, onFieldChange, handleSave, saving, isLoading, sortedHistory, isHistoryLoading };
};
