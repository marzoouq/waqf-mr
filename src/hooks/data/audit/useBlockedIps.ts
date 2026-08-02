/**
 * useBlockedIps — عرض وإدارة العناوين المحجوبة (الناظر يحجب/يفتح، الدعم يعرض).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rpc } from '@/lib/api/rpc';
import { auditKeys } from '@/lib/queryKeys/auditKeys';

export interface BlockedIpRow {
  id: string;
  ip_address: string;
  reason: string;
  auto_blocked: boolean;
  incident_count: number;
  last_event_type: string | null;
  last_email: string | null;
  expires_at: string | null;
  released_at: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  recent_events: number;
  distinct_emails: number;
}

const KEY = auditKeys.tracking.blockedIps;

export const useBlockedIps = () => {
  const queryClient = useQueryClient();

  const query = useQuery<BlockedIpRow[]>({
    queryKey: KEY,
    queryFn: ({ signal }) => rpc<BlockedIpRow[]>('admin_blocked_ips', {}, { signal }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

  const blockIp = useMutation({
    mutationFn: (input: { ip: string; reason?: string; hours?: number | null }) =>
      rpc('admin_block_ip', {
        p_ip: input.ip,
        p_reason: input.reason ?? null,
        p_hours: input.hours ?? null,
      }),
    onSuccess: invalidate,
  });

  const unblockIp = useMutation({
    mutationFn: (ip: string) => rpc('admin_unblock_ip', { p_ip: ip }),
    onSuccess: invalidate,
  });

  return { ...query, blockIp, unblockIp };
};
