/**
 * useEmailMonitorPage — Hook لجلب إحصاءات البريد الإلكتروني
 * - يجلب logs مع deduplication حسب message_id
 * - يحسب stats للفترة المختارة
 * - يدعم فلاتر template/status/range
 * - يستدعي email-admin edge function لإحصاءات DLQ والـ retry
 */
import { useEffect, useMemo, useState } from 'react';
import { useEmailLogs, useEmailAdminStats, type EmailLogRow, type EmailAdminStats } from '@/hooks/data/email/useEmailMonitor';
import { useEmailMonitorActions } from './useEmailMonitorActions';

export type EmailRange = '24h' | '7d' | '30d' | 'custom';
export type EmailStatusFilter = 'all' | 'sent' | 'dlq' | 'failed' | 'suppressed' | 'pending';

export interface EmailLogRow {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  dlq: number;
  suppressed: number;
  pending: number;
}

export interface EmailAdminStats {
  last_log_at: string | null;
  auth_dlq_count: number;
  transactional_dlq_count: number;
  rate_limited_until: string | null;
}

const RANGE_HOURS: Record<Exclude<EmailRange, 'custom'>, number> = {
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
};

function getStartIso(range: EmailRange, customStart?: string) {
  if (range === 'custom' && customStart) return customStart;
  const hours = RANGE_HOURS[range as Exclude<EmailRange, 'custom'>] ?? 24 * 7;
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export function useEmailMonitorPage() {
  const [range, setRange] = useState<EmailRange>('7d');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [showCustom, setShowCustom] = useState(false);
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<EmailStatusFilter>('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const startIso = useMemo(() => getStartIso(range, customStart || undefined), [range, customStart]);
  const endIso = useMemo(() => (range === 'custom' && customEnd ? customEnd : new Date().toISOString()), [range, customEnd]);

  // جلب السجلات (raw, ثم deduplication في الذاكرة)
  const logsQuery = useQuery({
    queryKey: ['email-logs', startIso, endIso],
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

  // إحصاءات DLQ + last_run عبر edge function
  const adminStatsQuery = useQuery({
    queryKey: ['email-admin-stats'],
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

  // Deduplication: latest row per message_id
  const dedupedLogs = useMemo(() => {
    const rows = logsQuery.data ?? [];
    const seen = new Map<string, EmailLogRow>();
    for (const row of rows) {
      const key = row.message_id ?? row.id;
      if (!seen.has(key)) seen.set(key, row);
    }
    return Array.from(seen.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [logsQuery.data]);

  // قائمة templates للفلتر
  const templates = useMemo(() => {
    const set = new Set<string>();
    for (const row of dedupedLogs) set.add(row.template_name);
    return Array.from(set).sort();
  }, [dedupedLogs]);

  // فلترة
  const filteredLogs = useMemo(() => {
    return dedupedLogs.filter((row) => {
      if (templateFilter !== 'all' && row.template_name !== templateFilter) return false;
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      return true;
    });
  }, [dedupedLogs, templateFilter, statusFilter]);

  // Stats
  const stats: EmailStats = useMemo(() => {
    const s: EmailStats = { total: 0, sent: 0, failed: 0, dlq: 0, suppressed: 0, pending: 0 };
    for (const row of filteredLogs) {
      s.total++;
      if (row.status === 'sent') s.sent++;
      else if (row.status === 'dlq') s.dlq++;
      else if (row.status === 'failed') s.failed++;
      else if (row.status === 'suppressed') s.suppressed++;
      else if (row.status === 'pending') s.pending++;
    }
    return s;
  }, [filteredLogs]);

  // pagination
  const pagedLogs = useMemo(
    () => filteredLogs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filteredLogs, page],
  );
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));

  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset pagination عند تغيّر الفلتر (نمط رسمي)
  useEffect(() => { setPage(0); }, [range, customStart, customEnd, templateFilter, statusFilter]);

  // إعادة محاولة DLQ + refresh مفصولة في hook خاص
  const { retry, isRetrying, refresh } = useEmailMonitorActions();

  return {
    // state
    range, setRange,
    customStart, setCustomStart,
    customEnd, setCustomEnd,
    showCustom, setShowCustom,
    templateFilter, setTemplateFilter,
    statusFilter, setStatusFilter,
    page, setPage,
    totalPages,
    PAGE_SIZE,
    // data
    logs: pagedLogs,
    totalCount: filteredLogs.length,
    templates,
    stats,
    adminStats: adminStatsQuery.data,
    // status
    isLoading: logsQuery.isLoading,
    isError: logsQuery.isError,
    isAdminLoading: adminStatsQuery.isLoading,
    // actions
    refresh,
    retry,
    isRetrying,
  };
}
