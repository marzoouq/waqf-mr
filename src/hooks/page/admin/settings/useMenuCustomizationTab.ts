/**
 * Page hook: MenuCustomizationTab
 */
import { useState, useEffect } from 'react';
import { useAppSettings } from '@/hooks/data/settings/app/useAppSettings';
import { defaultMenuLabels, type MenuLabels } from '@/types/navigation';

/** كل مسميات القائمة القابلة للتخصيص — مشتقة من الافتراضيات حتى لا تنقص أي صفحة */
export const MENU_ITEMS: { key: keyof MenuLabels; defaultLabel: string }[] =
  (Object.keys(defaultMenuLabels) as (keyof MenuLabels)[]).map((key) => ({ key, defaultLabel: defaultMenuLabels[key] }));

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
