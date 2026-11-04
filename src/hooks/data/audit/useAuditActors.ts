import { useQuery } from '@tanstack/react-query';
import { rpc } from '@/lib/api/rpc';

export interface AuditActor { user_id: string; email: string | null; role: string | null }

/** Resolve executor email/role for the audit rows on the current page. */
export const useAuditActors = (userIds: string[]) => {
  const ids = [...new Set(userIds)].sort();
  return useQuery({
    queryKey: ['audit_log_actors', ids],
    enabled: ids.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const rows = (await rpc('audit_log_actors', { p_user_ids: ids }, { signal })) as AuditActor[] | null;
      return new Map((rows ?? []).map(r => [r.user_id, r]));
    },
  });
};
