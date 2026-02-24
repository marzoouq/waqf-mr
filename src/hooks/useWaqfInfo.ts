import { useAppSettings } from './useAppSettings';

export interface WaqfInfo {
  waqf_name: string;
  waqf_founder: string;
  waqf_admin: string;
  waqf_deed_number: string;
  waqf_deed_date: string;
  waqf_nazara_number: string;
  waqf_nazara_date: string;
  waqf_court: string;
  waqf_logo_url: string;
}

const WAQF_KEYS = [
  'waqf_name', 'waqf_founder', 'waqf_admin',
  'waqf_deed_number', 'waqf_deed_date',
  'waqf_nazara_number', 'waqf_nazara_date', 'waqf_court',
  'waqf_logo_url',
] as const;

export const useWaqfInfo = () => {
  const { data: settings, isLoading, error } = useAppSettings();

  const info: WaqfInfo = {
    waqf_name: settings?.waqf_name || '',
    waqf_founder: settings?.waqf_founder || '',
    waqf_admin: settings?.waqf_admin || '',
    waqf_deed_number: settings?.waqf_deed_number || '',
    waqf_deed_date: settings?.waqf_deed_date || '',
    waqf_nazara_number: settings?.waqf_nazara_number || '',
    waqf_nazara_date: settings?.waqf_nazara_date || '',
    waqf_court: settings?.waqf_court || '',
    waqf_logo_url: settings?.waqf_logo_url || '',
  };

  return { data: info, isLoading, error };
};
