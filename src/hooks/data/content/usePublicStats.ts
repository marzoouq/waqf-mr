/**
 * هوك لجلب الإحصائيات العامة للصفحة الرئيسية
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_STATIC } from '@/lib/queryStaleTime';

const placeholderStats = [
  { label: 'عقار مُدار', value: '0' },
  { label: 'مستفيد', value: '0' },
  { label: 'تقرير سنوي', value: '0' },
];

export function usePublicStats() {
  const query = useQuery({
    queryKey: ['public-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_stats');
      if (error) throw error;
      const d = data as { properties: number; beneficiaries: number; fiscal_years: number };
      return [
        { label: 'عقار مُدار', value: String(d.properties ?? 0) },
        { label: 'مستفيد', value: String(d.beneficiaries ?? 0) },
        { label: 'تقرير سنوي', value: String(d.fiscal_years ?? 0) },
      ];
    },
    staleTime: STALE_STATIC,
    gcTime: 10 * 60 * 1000,
    placeholderData: placeholderStats,
  });

  return {
    stats: query.data ?? placeholderStats,
    statsLoading: query.isLoading,
  };
}
