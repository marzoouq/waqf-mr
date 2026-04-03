/**
 * هوك جلب السنوات المالية المنشورة
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePublishedFiscalYears = () => {
  return useQuery({
    queryKey: ['fiscal_years_published_all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('fiscal_years')
        .select('id, label')
        .eq('published', true)
        .order('start_date', { ascending: false });
      return data ?? [];
    },
  });
};
