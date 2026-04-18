/**
 * useWaqfInfo — هوك متخصص لجلب معلومات الوقف المنشورة
 *
 * مستخرج من useAppSettings.ts ضمن موجة P3 الختامية. يوفر واجهة
 * مُمَيّزة (typed) لمعلومات الوقف مع memoization للقيمة المُرجعة.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { STALE_SETTINGS } from '@/lib/queryStaleTime';
import { settingsQueryFn } from './useAppSettingsRead';

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
  vat_registration_number: string;
}

export const useWaqfInfo = () => {
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['app-settings-all'],
    queryFn: settingsQueryFn,
    staleTime: STALE_SETTINGS,
    gcTime: 1000 * 60 * 30,
  });

  const info: WaqfInfo = useMemo(() => ({
    waqf_name: settings?.waqf_name || '',
    waqf_founder: settings?.waqf_founder || '',
    waqf_admin: settings?.waqf_admin || '',
    waqf_deed_number: settings?.waqf_deed_number || '',
    waqf_deed_date: settings?.waqf_deed_date || '',
    waqf_nazara_number: settings?.waqf_nazara_number || '',
    waqf_nazara_date: settings?.waqf_nazara_date || '',
    waqf_court: settings?.waqf_court || '',
    waqf_logo_url: settings?.waqf_logo_url || '',
    vat_registration_number: settings?.vat_registration_number || '',
  }), [settings]);

  return { data: info, isLoading, error };
};
