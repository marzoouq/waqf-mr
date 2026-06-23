/**
 * هوك جلب السنوات المالية المنشورة
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fiscalYearKeys } from '@/lib/queryKeys/fiscalYearKeys';

export const usePublishedFiscalYears = () => {
  return useQuery({
    queryKey: fiscalYearKeys.publishedAll(),
    queryFn: async ({ signal: _signal }) => {
      const { data } = await supabase
        .from('fiscal_years')
        .select('id, label')
        .eq('published', true)
        .order('start_date', { ascending: false });
      return data ?? [];
    },
  });
};
