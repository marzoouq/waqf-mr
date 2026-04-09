/**
 * هوكات إحصائيات سجل المراجعة — مستخرجة من useAuditLogPage
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_MESSAGING } from '@/lib/queryStaleTime';
import type { AuditLogEntry } from './useAuditLog';

/** عدد عمليات سجل المراجعة اليوم */
export function useAuditLogTodayCount() {
  return useQuery({
    queryKey: ['audit_log_today_count'],
    staleTime: STALE_MESSAGING,
    queryFn: async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('audit_log')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStr);
      return count ?? 0;
    },
  });
}

/** جلب سجلات المراجعة للتصدير */
export async function fetchAuditLogForExport(filters: {
  tableFilter?: string;
  opFilter?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<AuditLogEntry[]> {
  let query = supabase
    .from('audit_log')
    .select('id, table_name, operation, record_id, old_data, new_data, user_id, created_at')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (filters.tableFilter && filters.tableFilter !== 'all') {
    query = query.eq('table_name', filters.tableFilter);
  }
  if (filters.opFilter && filters.opFilter !== 'all') {
    query = query.eq('operation', filters.opFilter);
  }
  if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
  if (filters.dateTo) query = query.lte('created_at', filters.dateTo + 'T23:59:59');

  const { data } = await query;
  // select() → old_data/new_data: Json ≠ Record — يحتاج Zod validation لاحقاً
  return (data as unknown as AuditLogEntry[]) || [];
}
