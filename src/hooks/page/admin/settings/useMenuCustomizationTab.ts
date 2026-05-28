/**
 * Page hook: MenuCustomizationTab
 */
import { useState, useEffect } from 'react';
import { useAppSettings } from '@/hooks/data/settings/app/useAppSettings';
import { defaultMenuLabels, type MenuLabels } from '@/types/navigation';

export const MENU_ITEMS: { key: keyof MenuLabels; defaultLabel: string }[] = [
  { key: 'home', defaultLabel: 'الرئيسية' },
  { key: 'properties', defaultLabel: 'العقارات' },
  { key: 'contracts', defaultLabel: 'العقود' },
  { key: 'income', defaultLabel: 'الدخل' },
  { key: 'expenses', defaultLabel: 'المصروفات' },
  { key: 'beneficiaries', defaultLabel: 'المستفيدين' },
  { key: 'reports', defaultLabel: 'التقارير' },
  { key: 'accounts', defaultLabel: 'الحسابات' },
  { key: 'users', defaultLabel: 'إدارة المستخدمين' },
  { key: 'settings', defaultLabel: 'الإعدادات' },
  { key: 'messages', defaultLabel: 'المراسلات' },
  { key: 'invoices', defaultLabel: 'الفواتير' },
  { key: 'audit_log', defaultLabel: 'سجل المراجعة' },
  { key: 'bylaws', defaultLabel: 'اللائحة التنظيمية' },
  { key: 'chart_of_accounts', defaultLabel: 'الشجرة المحاسبية' },
  { key: 'beneficiary_view', defaultLabel: 'واجهة المستفيد' },
];

export const useMenuCustomizationTab = () => {
  const { getJsonSetting, updateJsonSetting, isLoading } = useAppSettings();
  const labels = getJsonSetting<MenuLabels>('menu_labels', defaultMenuLabels);
  const [form, setForm] = useState<MenuLabels>(labels);

  useEffect(() => {
    const next = JSON.stringify(labels);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local form with remote settings only when content changes
    setForm((prev) => JSON.stringify(prev) === next ? prev : labels);
  }, [labels]);

  const handleChange = (key: keyof MenuLabels, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => updateJsonSetting('menu_labels', form);

  const handleReset = () => {
    setForm(defaultMenuLabels);
    updateJsonSetting('menu_labels', defaultMenuLabels);
  };

  return { form, handleChange, handleSave, handleReset, isLoading };
};
