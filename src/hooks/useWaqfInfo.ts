import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
];

export const useWaqfInfo = () => {
  return useQuery({
    queryKey: ['waqf-info'],
    queryFn: async (): Promise<WaqfInfo> => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', WAQF_KEYS);

      if (error) throw error;

      const info: Record<string, string> = {};
      data?.forEach((row) => {
        info[row.key] = row.value;
      });

      return {
        waqf_name: info.waqf_name || '',
        waqf_founder: info.waqf_founder || '',
        waqf_admin: info.waqf_admin || '',
        waqf_deed_number: info.waqf_deed_number || '',
        waqf_deed_date: info.waqf_deed_date || '',
        waqf_nazara_number: info.waqf_nazara_number || '',
        waqf_nazara_date: info.waqf_nazara_date || '',
        waqf_court: info.waqf_court || '',
        waqf_logo_url: info.waqf_logo_url || '',
      };
    },
    staleTime: 1000 * 60 * 10,
  });
};
