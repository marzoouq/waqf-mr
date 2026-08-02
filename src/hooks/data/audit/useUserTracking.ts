/**
 * هوكات تتبع المستخدمين (قراءة فقط) — للناظر والدعم الفني.
 * كل الاستعلامات عبر دوال SECURITY DEFINER تتحقق من الدور داخلياً.
 */
import { useQuery } from '@tanstack/react-query';
import { rpc } from '@/lib/api/rpc';
import { STALE_AUDIT } from '@/lib/queryStaleTime';

export interface ActiveSession {
  user_id: string;
  email: string | null;
  display_name: string | null;
  roles: string | null;
  session_id: string | null;
  current_path: string | null;
  last_activity: string;
  events: number;
  ip_address: string | null;
  device_info: string | null;
}

export interface UserActivityRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  roles: string | null;
  sessions: number;
  page_views: number;
  distinct_paths: number;
  total_seconds: number;
  errors: number;
  first_seen: string;
  last_seen: string;
  last_path: string | null;
}

export interface TimelineRow {
  occurred_at: string;
  source: string;
  event_type: string;
  target_path: string | null;
  detail: string | null;
  ip_address: string | null;
  session_id: string | null;
  device_info: string | null;
}

/** المتواجدون الآن (نافذة زمنية بالدقائق) */
export const useActiveSessions = (minutes = 15, autoRefresh = true) =>
  useQuery<ActiveSession[]>({
    queryKey: ['admin_active_sessions', minutes],
    queryFn: ({ signal }) => rpc<ActiveSession[]>('admin_active_sessions', { p_minutes: minutes }, { signal }),
    refetchInterval: autoRefresh ? 20_000 : false,
    staleTime: 10_000,
  });

/** ملخص نشاط كل مستخدم خلال فترة */
export const useUserActivitySummary = (days = 30) =>
  useQuery<UserActivityRow[]>({
    queryKey: ['admin_user_activity_summary', days],
    queryFn: ({ signal }) => rpc<UserActivityRow[]>('admin_user_activity_summary', { p_days: days }, { signal }),
    staleTime: STALE_AUDIT,
  });

/** الخط الزمني الكامل لمستخدم محدد */
export const useUserTimeline = (userId: string | null, days = 60) =>
  useQuery<TimelineRow[]>({
    queryKey: ['admin_user_timeline', userId, days],
    enabled: Boolean(userId),
    queryFn: ({ signal }) =>
      rpc<TimelineRow[]>('admin_user_timeline', { p_user_id: userId, p_days: days, p_limit: 500 }, { signal }),
    staleTime: STALE_AUDIT,
  });
