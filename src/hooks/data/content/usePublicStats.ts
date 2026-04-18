/**
 * هوك لجلب الإحصائيات العامة للصفحة الرئيسية
 *
 * بنية الإرجاع من الـ RPC بعد موجة P10:
 *   { stats: [{ key, label, value, visible }] }
 * — الناظر يتحكم في الوضع (auto/manual/hidden) لكل إحصائية عبر app_settings.
 * — الإحصائيات المخفية لا تصل من الـ RPC أصلاً (يتم حذفها server-side).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_STATIC } from '@/lib/queryStaleTime';

interface PublicStat {
  key: string;
  label: string;
  value: string;
  visible: boolean;
}

const placeholderStats: PublicStat[] = [
  { key: 'properties',    label: 'عقار مُدار',  value: '0', visible: true },
  { key: 'beneficiaries', label: 'مستفيد',      value: '0', visible: true },
  { key: 'fiscal_years',  label: 'تقرير سنوي',  value: '0', visible: true },
];

export function usePublicStats() {
  const query = useQuery({
    queryKey: ['public-stats'],
    queryFn: async (): Promise<PublicStat[]> => {
      const { data, error } = await supabase.rpc('get_public_stats');
      if (error) throw error;
      const payload = data as { stats?: PublicStat[] } | null;
      const list = Array.isArray(payload?.stats) ? payload!.stats : [];
      // فلترة دفاعية إضافية للعناصر المخفية (الـ RPC لا يُرجعها أصلاً، لكن للأمان)
      return list.filter(s => s && s.visible !== false);
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
