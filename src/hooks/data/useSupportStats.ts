/**
 * إحصائيات وتحليلات الدعم الفني + أخطاء العميل — مفصول من useSupportTickets
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_MESSAGING } from '@/lib/queryStaleTime';
import type { ClientError, SupportAnalyticsData } from './supportTypes';

/** جلب أخطاء التطبيق من سجل الوصول */
export const useClientErrors = () => {
  return useQuery({
    queryKey: ['client_errors'],
    staleTime: STALE_MESSAGING,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_log')
        .select('id, event_type, target_path, metadata, created_at, user_id, email')
        .eq('event_type', 'client_error')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as ClientError[];
    },
  });
};

/** إحصائيات الدعم الفني — RPC واحد */
export const useSupportStats = () => {
  return useQuery({
    queryKey: ['support_stats'],
    staleTime: STALE_MESSAGING,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_support_stats');
      if (error) throw error;
      return data as {
        totalTickets: number;
        openTickets: number;
        inProgressTickets: number;
        resolvedTickets: number;
        highPriorityTickets: number;
        ticketsLast7d: number;
        totalErrors: number;
        errorsLast24h: number;
        errorsLast7d: number;
      };
    },
  });
};

/** تحليلات الدعم المجمّعة */
export const useSupportAnalytics = () => {
  return useQuery({
    queryKey: ['support_analytics'],
    staleTime: STALE_MESSAGING,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_support_analytics');
      if (error) throw error;
      return data as unknown as SupportAnalyticsData;
    },
  });
};
