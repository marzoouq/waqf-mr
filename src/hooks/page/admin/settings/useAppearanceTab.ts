/**
 * Page hook: AppearanceTab
 */
import { useAppearanceSettings, type AppearanceSettings } from '@/hooks/data/settings/appearance/useAppearanceSettings';
import { useSyncedFormState } from '@/hooks/ui/useSyncedFormState';

export const useAppearanceTab = () => {
  const { settings, isLoading, save } = useAppearanceSettings();
  const [form, setForm] = useSyncedFormState<AppearanceSettings>(settings);

  const onSystemNameChange = (value: string) => {
    setForm((p) => ({ ...p, system_name: value }));
  };

  const handleSave = () => save({ system_name: form.system_name });

  return { form, onSystemNameChange, handleSave, isLoading };
};
