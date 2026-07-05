/**
 * useIntrusionSummary — ملخص محاولات الاختراق للناظر
 * يعتمد على RPC admin_intrusion_summary (SECURITY DEFINER + admin guard)
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_MESSAGING } from '@/lib/queryStaleTime';

export interface IntrusionSummary {
  since: string;
  hours: number;
  failed_logins: number;
  unauthorized_access: number;
  rls_violations: number;
  client_errors: number;
  role_changes: number;
  top_failed_emails: Array<{ email: string; cnt: number }>;
  top_error_paths: Array<{ path: string; cnt: number }>;
}

export const useIntrusionSummary = (hours = 24) => {
  return useQuery({
    queryKey: ['diagnostics', 'intrusion_summary', hours] as const,
    staleTime: STALE_MESSAGING,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_intrusion_summary', { p_hours: hours });
      if (error) throw error;
      return data as unknown as IntrusionSummary;
    },
  });
};
