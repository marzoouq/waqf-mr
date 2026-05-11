/**
 * Page hook: BannerSettingsTab
 */
import { useState, useEffect } from 'react';
import { useBannerSettings } from '@/hooks/data/settings/useBannerSettings';
import type { BannerSettings } from '@/constants';

export const useBannerSettingsTab = () => {
  const { settings, isLoading, save: saveSettings } = useBannerSettings();
  const [form, setForm] = useState<BannerSettings>(settings);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const save = (patch: Partial<BannerSettings>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    saveSettings(patch);
  };

  const setText = (text: string) => setForm((p) => ({ ...p, text }));
  const flushText = () => save({ text: form.text });

  return { form, save, setText, flushText, isLoading };
};
