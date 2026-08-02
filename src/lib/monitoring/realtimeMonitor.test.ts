import { describe, it, expect } from 'vitest';
import { classifyRealtimeIssue, isRealtimeIssue, buildRealtimeAlertMessage } from './realtimeMonitor';

describe('realtimeMonitor', () => {
  it('يكتشف أخطاء Realtime فقط', () => {
    expect(isRealtimeIssue('cannot add postgres_changes callbacks after subscribe()')).toBe(true);
    expect(isRealtimeIssue('TypeError: x is not a function')).toBe(false);
  });

  it('يصنّف الأنماط المعروفة', () => {
    expect(classifyRealtimeIssue('cannot add postgres_changes callbacks after subscribe()')).toBe('callback_after_subscribe');
    expect(classifyRealtimeIssue('CHANNEL_ERROR on channel x')).toBe('channel_error');
    expect(classifyRealtimeIssue('realtime TIMED_OUT')).toBe('timeout');
    expect(classifyRealtimeIssue('realtime channel closed')).toBe('closed');
    expect(classifyRealtimeIssue('realtime weirdness')).toBe('unknown');
  });

  it('يبني رسالة تطابق قواعد التنبيه في قاعدة البيانات', () => {
    const msg = buildRealtimeAlertMessage('callback_after_subscribe', 'raw');
    expect(msg).toContain('postgres_changes');
    expect(msg).toContain('after subscribe()');
  });
});
