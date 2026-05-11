/**
 * Page hook: AppearanceTab
 */
import { useState, useEffect } from 'react';
import { useAppearanceSettings, type AppearanceSettings } from '@/hooks/data/settings/useAppearanceSettings';

export const useAppearanceTab = () => {
  const { settings, isLoading, save } = useAppearanceSettings();
  const [form, setForm] = useState<AppearanceSettings>(settings);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const onSystemNameChange = (value: string) => {
    setForm((p) => ({ ...p, system_name: value }));
  };

  const handleSave = () => save({ system_name: form.system_name });

  return { form, onSystemNameChange, handleSave, isLoading };
};
