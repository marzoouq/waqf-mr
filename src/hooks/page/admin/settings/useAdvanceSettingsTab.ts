/**
 * Page hook: AdvanceSettingsTab
 */
import { useState, useEffect } from 'react';
import { useAppSettings } from '@/hooks/data/settings/app/useAppSettings';

export interface AdvanceSettingsForm {
  enabled: boolean;
  min_amount: number;
  max_percentage: number;
}

const DEFAULTS: AdvanceSettingsForm = { enabled: true, min_amount: 500, max_percentage: 50 };

export const useAdvanceSettingsTab = () => {
  const { getJsonSetting, updateJsonSetting, isLoading } = useAppSettings();
  const [form, setForm] = useState<AdvanceSettingsForm>(DEFAULTS);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !initialized) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- تهيئة form من الإعدادات بعد التحميل (يعمل مرة واحدة)
      setForm(getJsonSetting('advance_settings', DEFAULTS));
      setInitialized(true);
    }
  }, [getJsonSetting, isLoading, initialized]);

  const setEnabled = (enabled: boolean) => setForm(p => ({ ...p, enabled }));
  const setMinAmount = (min_amount: number) => setForm(p => ({ ...p, min_amount }));
  const setMaxPercentage = (max_percentage: number) => setForm(p => ({ ...p, max_percentage }));

  const handleSave = async () => {
    if (form.enabled) {
      if (form.min_amount < 0) return;
      if (form.max_percentage < 1 || form.max_percentage > 100) return;
    }
    setSaving(true);
    try {
      await updateJsonSetting('advance_settings', form);
    } finally {
      setSaving(false);
    }
  };

  return { form, setEnabled, setMinAmount, setMaxPercentage, handleSave, saving, isLoading };
};
