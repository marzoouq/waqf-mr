/**
 * مراقب أخطاء Realtime — يصنّف أخطاء القنوات ويرسلها إلى سجل الوصول
 * لتلتقطها قواعد التنبيه في قاعدة البيانات (trg_detect_error_alerts).
 */
import { reportClientError } from '@/lib/errorReporter';
import { logger } from '@/lib/logger';

export type RealtimeIssueCategory =
  | 'callback_after_subscribe'
  | 'channel_error'
  | 'timeout'
  | 'closed'
  | 'unknown';

const PATTERNS: Array<{ rx: RegExp; category: RealtimeIssueCategory }> = [
  { rx: /postgres_changes[\s\S]*after[\s\S]*subscribe/i, category: 'callback_after_subscribe' },
  { rx: /CHANNEL_ERROR/i, category: 'channel_error' },
  { rx: /(timed?\s*out|TIMED_OUT)/i, category: 'timeout' },
  { rx: /(CLOSED|channel closed)/i, category: 'closed' },
];

/** هل الرسالة تتعلق بـ Realtime؟ */
export function isRealtimeIssue(message: string): boolean {
  if (!message) return false;
  return /postgres_changes|realtime|CHANNEL_ERROR|TIMED_OUT/i.test(message);
}

/** تصنيف رسالة خطأ Realtime */
export function classifyRealtimeIssue(message: string): RealtimeIssueCategory {
  for (const p of PATTERNS) {
    if (p.rx.test(message)) return p.category;
  }
  return 'unknown';
}

/** الرسالة المعيارية التي تُطابقها قواعد التنبيه في قاعدة البيانات */
export function buildRealtimeAlertMessage(category: RealtimeIssueCategory, raw: string): string {
  switch (category) {
    case 'callback_after_subscribe':
      return `realtime: cannot add postgres_changes callbacks after subscribe() — ${raw}`;
    case 'channel_error':
      return `realtime CHANNEL_ERROR — ${raw}`;
    case 'timeout':
      return `realtime channel timed out — ${raw}`;
    case 'closed':
      return `realtime channel closed unexpectedly — ${raw}`;
    default:
      return `realtime issue — ${raw}`;
  }
}

/** إبلاغ عن مشكلة Realtime (يفعّل قواعد التنبيه فوراً على الخادم) */
export function reportRealtimeIssue(rawMessage: string, context?: { channel?: string; stack?: string | null }): RealtimeIssueCategory {
  const category = classifyRealtimeIssue(rawMessage);
  const message = buildRealtimeAlertMessage(category, `${context?.channel ? `[${context.channel}] ` : ''}${rawMessage}`.slice(0, 400));
  logger.warn('[RealtimeMonitor]', message);
  void reportClientError({
    error_name: 'RealtimeError',
    error_message: message,
    error_stack: context?.stack ?? null,
    component_stack: null,
    url: typeof window !== 'undefined' ? window.location.pathname : null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    timestamp: new Date().toISOString(),
  });
  return category;
}

/** غلاف لحالة اشتراك القناة — يُبلّغ تلقائياً عند الفشل */
export function withChannelStatusReport(channelName: string) {
  return (status: string, err?: unknown): void => {
    if (status === 'SUBSCRIBED') return;
    if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      const raw = err instanceof Error ? err.message : (typeof err === 'string' ? err : status);
      reportRealtimeIssue(raw === status ? `${status} on channel ${channelName}` : raw, {
        channel: channelName,
        stack: err instanceof Error ? (err.stack ?? null) : null,
      });
    }
  };
}
