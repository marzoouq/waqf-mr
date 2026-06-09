/**
 * useEmailMonitor — طبقة بيانات لمراقبة البريد الإلكتروني
 * - يجلب email_send_log الخام
 * - يستدعي email-admin edge function لإحصاءات الإدارة (DLQ/last_run/rate)
 * - منفصل عن منطق العرض (deduplication/فلترة/pagination) الموجود في hooks/page
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invoke } from '@/lib/api/invoke';
import { emailKeys } from '@/lib/queryKeys/emailKeys';

export interface EmailLogRow {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface EmailAdminStats {
  last_log_at: string | null;
  auth_dlq_count: number;
  transactional_dlq_count: number;
  rate_limited_until: string | null;
}

export function useEmailLogs(startIso: string, endIso: string) {
  return useQuery({
    queryKey: emailKeys.logs(startIso, endIso),
    queryFn: async (): Promise<EmailLogRow[]> => {
      const { data, error } = await supabase
        .from('email_send_log')
        .select('id, message_id, template_name, recipient_email, status, error_message, created_at')
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as EmailLogRow[];
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useEmailAdminStats() {
  return useQuery({
    queryKey: emailKeys.adminStats,
    queryFn: async (): Promise<EmailAdminStats> => {
      const data = await invoke<Partial<EmailAdminStats>>('email-admin', {
        body: { action: 'get_stats' },
      });
      return {
        last_log_at: data?.last_log_at ?? null,
        auth_dlq_count: data?.auth_dlq_count ?? 0,
        transactional_dlq_count: data?.transactional_dlq_count ?? 0,
        rate_limited_until: data?.rate_limited_until ?? null,
      };
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
