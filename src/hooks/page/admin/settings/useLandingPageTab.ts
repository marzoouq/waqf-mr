/**
 * Page hook: LandingPageTab
 */
import { useAppSettings, useSetting } from '@/hooks/data/settings/app/useAppSettings';
import { useSyncedFormState } from '@/hooks/ui/useSyncedFormState';
import type { LandingPageContent } from '@/types/landing';

const DEFAULTS: LandingPageContent = {
  hero_title: 'نظام إدارة الوقف',
  hero_subtitle: 'منصة متكاملة لإدارة أملاك الوقف وتوزيع الريع على المستفيدين',
  hero_tagline: 'حفظ الأمانة · إدارة الممتلكات · توزيع عادل',
  cta_text: 'دخول النظام',
  features_title: 'مميزات النظام',
  features_subtitle: 'أدوات شاملة لإدارة الوقف بكفاءة وشفافية تامة',
  cta_section_title: 'ابدأ بإدارة وقفك بكفاءة اليوم',
  cta_section_subtitle: 'سجّل دخولك للوصول إلى لوحة التحكم وإدارة جميع جوانب الوقف',
  footer_text: 'نظام إدارة الوقف © {year} — جميع الحقوق محفوظة',
};

export const useLandingPageTab = () => {
  const { getJsonSetting, updateJsonSetting, isLoading } = useAppSettings();
  const landingLogoUrl = useSetting('landing_logo_url');
  const content = getJsonSetting<LandingPageContent>('landing_page_content', DEFAULTS);
  const [form, setForm] = useSyncedFormState<LandingPageContent>(content);

  const handleChange = (key: keyof LandingPageContent, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => updateJsonSetting('landing_page_content', form);

  return { form, handleChange, handleSave, landingLogoUrl, isLoading };
};
