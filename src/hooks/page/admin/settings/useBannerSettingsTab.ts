/**
 * Page hook: BannerSettingsTab
 */
import { useBannerSettings } from '@/hooks/data/settings/appearance/useBannerSettings';
import { useSyncedFormState } from '@/hooks/ui/useSyncedFormState';
import type { BannerSettings } from '@/constants';

export const useBannerSettingsTab = () => {
  const { settings, isLoading, save: saveSettings } = useBannerSettings();
  const [form, setForm] = useSyncedFormState<BannerSettings>(settings);

  const save = (patch: Partial<BannerSettings>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    saveSettings(patch);
  };

  const setText = (text: string) => setForm((p) => ({ ...p, text }));
  const flushText = () => save({ text: form.text });

  return { form, save, setText, flushText, isLoading };
};
