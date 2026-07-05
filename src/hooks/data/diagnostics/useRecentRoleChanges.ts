/**
 * useRecentRoleChanges — كشف تغييرات صلاحيات المستخدمين لكشف التصعيد غير المصرح
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_MESSAGING } from '@/lib/queryStaleTime';

export interface RoleChange {
  id: string;
  operation: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  user_id: string | null;
  created_at: string;
}

export const useRecentRoleChanges = (hours = 168) => {
  return useQuery({
    queryKey: ['diagnostics', 'role_changes', hours] as const,
    staleTime: STALE_MESSAGING,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_recent_role_changes', { p_hours: hours });
      if (error) throw error;
      return (data ?? []) as unknown as RoleChange[];
    },
  });
};
