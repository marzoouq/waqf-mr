/**
 * Page hook: WaqfSettingsTab
 * يدير form state وحفظ بيانات الوقف والنسب المالية.
 */
import { useState, useEffect } from 'react';
import { uiNotify } from '@/lib/notify';
import { useAppSettings, useSetting } from '@/hooks/data/settings/app/useAppSettings';
import { SAVE_MESSAGES } from '@/lib/messages';

export interface WaqfFieldDef { key: string; label: string }

export const WAQF_FIELDS: WaqfFieldDef[] = [
  { key: 'waqf_name', label: 'اسم الوقف' },
  { key: 'waqf_founder', label: 'الواقف' },
  { key: 'waqf_admin', label: 'الناظر' },
  { key: 'waqf_deed_number', label: 'رقم صك الوقف' },
  { key: 'waqf_deed_date', label: 'تاريخ صك الوقف' },
  { key: 'waqf_nazara_number', label: 'رقم صك النظارة' },
  { key: 'waqf_nazara_date', label: 'تاريخ صك النظارة' },
  { key: 'waqf_court', label: 'المحكمة' },
];

export const FINANCIAL_FIELDS: WaqfFieldDef[] = [
  { key: 'admin_share_percentage', label: 'نسبة الناظر (%)' },
  { key: 'waqif_share_percentage', label: 'نسبة الواقف (%)' },
  { key: 'zakat_percentage', label: 'نسبة الزكاة (%)' },
  { key: 'fiscal_year', label: 'السنة المالية' },
];

export const useWaqfSettingsTab = () => {
  const { data: settings, isLoading, updateSettingsBatch } = useAppSettings();
  const waqfLogoUrl = useSetting('waqf_logo_url');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- تهيئة form من useAppSettings (مصدر خارجي)
    if (settings) setFormData({ ...settings });
  }, [settings]);

  const onFieldChange = (key: string, value: string) => {
    setFormData((p) => ({ ...p, [key]: value }));
  };

  const validatePercentage = (key: string, label: string, value: string): boolean => {
    if (!key.endsWith('_percentage')) return true;
    if (key === 'fiscal_year') return true;
    if (value.trim() === '' || value.trim() === '0') return true;
    const num = parseFloat(value);
    if (!Number.isFinite(num) || num < 0 || num > 100) {
      uiNotify.error(`${label}: يجب إدخال رقم بين 0 و 100`);
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const allFields = [...WAQF_FIELDS, ...FINANCIAL_FIELDS];
      const adminVal = parseFloat(formData['admin_share_percentage'] || '0') || 0;
      const waqifVal = parseFloat(formData['waqif_share_percentage'] || '0') || 0;
      if (adminVal + waqifVal > 100) {
        uiNotify.error('مجموع نسبة الناظر والواقف يتجاوز 100%');
        setSaving(false);
        return;
      }
      const now = new Date().toISOString();
      const rows: { key: string; value: string; updated_at: string }[] = [];
      for (const field of allFields) {
        const value = (formData[field.key] || '').trim();
        if (value.length > 500) { uiNotify.error(`${field.label} طويل جداً`); setSaving(false); return; }
        if (!validatePercentage(field.key, field.label, value)) { setSaving(false); return; }
        rows.push({ key: field.key, value, updated_at: now });
      }
      await updateSettingsBatch.mutateAsync(rows);
      uiNotify.success('تم حفظ البيانات بنجاح');
    } catch {
      uiNotify.error(SAVE_MESSAGES.saveError);
    } finally {
      setSaving(false);
    }
  };

  return { formData, onFieldChange, handleSave, saving, isLoading, waqfLogoUrl };
};
