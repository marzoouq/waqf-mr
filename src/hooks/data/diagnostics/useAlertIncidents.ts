/**
 * useAlertIncidents — حوادث التنبيه وقواعدها (الناظر والدعم الفني فقط)
 */
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_MESSAGING } from '@/lib/queryStaleTime';
import { withChannelStatusReport } from '@/lib/monitoring/realtimeMonitor';

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

export interface AlertIncident {
  id: string;
  rule_code: string;
  severity: AlertSeverity;
  title: string;
  summary: string;
  occurrences: number;
  target_path: string | null;
  sample_metadata: Record<string, unknown> | null;
  status: AlertStatus;
  first_seen_at: string;
  last_seen_at: string;
  notified_at: string | null;
}

export interface AlertRule {
  id: string;
  code: string;
  name: string;
  event_type: string;
  match_pattern: string | null;
  severity: AlertSeverity;
  threshold_count: number;
  window_minutes: number;
  cooldown_minutes: number;
  notify_in_app: boolean;
  notify_email: boolean;
  is_active: boolean;
}

const INCIDENTS_KEY = ['diagnostics', 'alert_incidents'] as const;
const RULES_KEY = ['diagnostics', 'alert_rules'] as const;

export const useAlertIncidents = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: INCIDENTS_KEY,
    staleTime: STALE_MESSAGING,
    queryFn: async (): Promise<AlertIncident[]> => {
      const { data, error } = await supabase
        .from('alert_incidents')
        .select('id, rule_code, severity, title, summary, occurrences, target_path, sample_metadata, status, first_seen_at, last_seen_at, notified_at')
        .order('last_seen_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as AlertIncident[];
    },
  });

  // تحديث فوري عند وصول حوادث جديدة
  useEffect(() => {
    const channel = supabase
      .channel('alert-incidents-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alert_incidents' }, () => {
        void queryClient.invalidateQueries({ queryKey: INCIDENTS_KEY });
      })
      .subscribe(withChannelStatusReport('alert-incidents-sync'));
    return () => { void supabase.removeChannel(channel); };
  }, [queryClient]);

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Exclude<AlertStatus, 'open'> }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      const patch = status === 'acknowledged'
        ? { status, acknowledged_by: uid, acknowledged_at: new Date().toISOString() }
        : { status, resolved_by: uid, resolved_at: new Date().toISOString() };
      const { error } = await supabase.from('alert_incidents').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: INCIDENTS_KEY }); },
  });

  return { ...query, setStatus };
};

export const useAlertRules = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: RULES_KEY,
    staleTime: STALE_MESSAGING,
    queryFn: async (): Promise<AlertRule[]> => {
      const { data, error } = await supabase
        .from('alert_rules')
        .select('id, code, name, event_type, match_pattern, severity, threshold_count, window_minutes, cooldown_minutes, notify_in_app, notify_email, is_active')
        .order('severity', { ascending: true })
        .order('code', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AlertRule[];
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<AlertRule, 'is_active' | 'notify_email' | 'notify_in_app' | 'threshold_count' | 'window_minutes' | 'cooldown_minutes'>> }) => {
      const { error } = await supabase.from('alert_rules').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: RULES_KEY }); },
  });

  return { ...query, updateRule };
};
