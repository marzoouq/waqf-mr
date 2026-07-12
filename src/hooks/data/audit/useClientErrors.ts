/**
 * هوك جلب أخطاء التطبيق من سجل الوصول — مع عدّ دقيق وفلترة ضجيج الاختبار.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_AUDIT } from '@/lib/queryStaleTime';
import { auditKeys } from '@/lib/queryKeys/auditKeys';

export interface ClientError {
  id: string;
  event_type: string;
  target_path: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user_id: string | null;
  email: string | null;
}

export interface ClientErrorsResult {
  rows: ClientError[];
  totalCount: number;
  testNoiseCount: number;
  last24hCount: number;
  displayedCount: number;
}

const TEST_NOISE_FILTER =
  "metadata->>error_message.ilike.Test %,metadata->>message.ilike.Test %";

const DISPLAY_LIMIT = 200;

/** جلب أخطاء التطبيق مع إحصاءات دقيقة (يستبعد ضجيج الاختبار افتراضياً). */
export const useClientErrors = (includeTestNoise = false) => {
  return useQuery<ClientErrorsResult>({
    queryKey: [...auditKeys.clientErrors, { includeTestNoise }],
    staleTime: STALE_AUDIT,
    queryFn: async () => {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const baseCount = supabase
        .from('access_log')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'client_error');

      const noiseCount = supabase
        .from('access_log')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'client_error')
        .or(TEST_NOISE_FILTER);

      const last24hCount = supabase
        .from('access_log')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'client_error')
        .gte('created_at', since24h);

      let rowsQuery = supabase
        .from('access_log')
        .select('id, event_type, target_path, metadata, created_at, user_id, email')
        .eq('event_type', 'client_error')
        .order('created_at', { ascending: false })
        .limit(DISPLAY_LIMIT);

      if (!includeTestNoise) {
        // استبعد الصفوف التي رسالتها تبدأ بـ "Test " في أيٍّ من المفاتيح المعروفة.
        rowsQuery = rowsQuery
          .not('metadata->>error_message', 'ilike', 'Test %')
          .not('metadata->>message', 'ilike', 'Test %');
      }

      const [totalRes, noiseRes, last24hRes, rowsRes] = await Promise.all([
        baseCount,
        noiseCount,
        last24hCount,
        rowsQuery,
      ]);

      if (rowsRes.error) throw rowsRes.error;

      const rows = (rowsRes.data ?? []) as ClientError[];
      return {
        rows,
        totalCount: totalRes.count ?? 0,
        testNoiseCount: noiseRes.count ?? 0,
        last24hCount: last24hRes.count ?? 0,
        displayedCount: rows.length,
      };
    },
  });
};
