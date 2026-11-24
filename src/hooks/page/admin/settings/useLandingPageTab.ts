/**
 * Page hook: LandingPageTab
 */
import { useMemo } from 'react';
import { useAppSettings, useSetting } from '@/hooks/data/settings/app/useAppSettings';
import { useSyncedFormState } from '@/hooks/ui/useSyncedFormState';
import type { LandingPageContent, LandingTextKey, LandingToggleKey } from '@/types/landing';
import { LANDING_DEFAULTS, withLandingDefaults } from '@/constants/landingDefaults';

export const useLandingPageTab = () => {
  const { getJsonSetting, updateJsonSetting, isLoading } = useAppSettings();
  const landingLogoUrl = useSetting('landing_logo_url');
  const saved = getJsonSetting<Partial<LandingPageContent>>('landing_page_content', LANDING_DEFAULTS);
  // تثبيت المرجع حتى لا يُعاد ضبط النموذج في كل رسم
  const savedKey = JSON.stringify(saved);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const content = useMemo(() => withLandingDefaults(saved), [savedKey]);
  const [form, setForm] = useSyncedFormState<LandingPageContent>(content);

  const handleChange = (key: LandingTextKey, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };
  const handleToggle = (key: LandingToggleKey, value: boolean) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => updateJsonSetting('landing_page_content', form);

  return { form, handleChange, handleToggle, handleSave, landingLogoUrl, isLoading };
};
