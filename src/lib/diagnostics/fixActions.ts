/**
 * fixActions — إصلاحات فورية قابلة للتنفيذ من مركز التشخيص
 * كلها إجراءات حقيقية (لا mock) وتُسجَّل في access_log عبر logAccessEvent.
 */
import type { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logAccessEvent } from '@/lib/services/accessLogService';
import { logger } from '@/lib/logger';

export interface FixActionResult {
  ok: boolean;
  message: string;
  details?: unknown;
}

/** 1) مسح كاش TanStack بالكامل */
export async function clearQueryCache(qc: QueryClient): Promise<FixActionResult> {
  try {
    qc.clear();
    await logAccessEvent({ event_type: 'diagnostics_run', metadata: { action: 'clear_query_cache' } });
    return { ok: true, message: 'تم مسح كاش الاستعلامات بنجاح' };
  } catch (e) {
    logger.error('[fix] clearQueryCache:', e);
    return { ok: false, message: 'فشل مسح الكاش' };
  }
}

/** 2) إلغاء تسجيل Service Worker */
export async function unregisterServiceWorker(): Promise<FixActionResult> {
  try {
    if (!('serviceWorker' in navigator)) {
      return { ok: false, message: 'Service Worker غير مدعوم' };
    }
    const regs = await navigator.serviceWorker.getRegistrations();
    let count = 0;
    for (const r of regs) {
      const ok = await r.unregister();
      if (ok) count++;
    }
    await logAccessEvent({ event_type: 'diagnostics_run', metadata: { action: 'unregister_sw', count } });
    return { ok: true, message: `تم إلغاء تسجيل ${count} Service Worker` };
  } catch (e) {
    logger.error('[fix] unregisterServiceWorker:', e);
    return { ok: false, message: 'فشل إلغاء تسجيل Service Worker' };
  }
}

/** 3) تحديث رمز المصادقة قسراً */
export async function forceTokenRefresh(): Promise<FixActionResult> {
  try {
    const { error } = await supabase.auth.refreshSession();
    if (error) throw error;
    await logAccessEvent({ event_type: 'diagnostics_run', metadata: { action: 'force_token_refresh' } });
    return { ok: true, message: 'تم تحديث جلسة المصادقة' };
  } catch (e) {
    logger.error('[fix] forceTokenRefresh:', e);
    return { ok: false, message: 'فشل تحديث الجلسة' };
  }
}

/** 4) إعادة تحميل الصفحة بعد مسح ذاكرة التخزين المؤقت للمتصفح */
export async function hardReload(): Promise<FixActionResult> {
  try {
    await logAccessEvent({ event_type: 'diagnostics_run', metadata: { action: 'hard_reload' } });
    window.setTimeout(() => window.location.reload(), 300);
    return { ok: true, message: 'إعادة تحميل الصفحة...' };
  } catch (e) {
    return { ok: false, message: 'فشل إعادة التحميل' };
  }
}

/** 5) إبطال جميع اشتراكات Realtime */
export async function resetRealtimeChannels(): Promise<FixActionResult> {
  try {
    const channels = supabase.getChannels();
    for (const c of channels) await supabase.removeChannel(c);
    await logAccessEvent({ event_type: 'diagnostics_run', metadata: { action: 'reset_realtime', count: channels.length } });
    return { ok: true, message: `أُغلقت ${channels.length} قناة Realtime` };
  } catch (e) {
    logger.error('[fix] resetRealtimeChannels:', e);
    return { ok: false, message: 'فشل إعادة ضبط Realtime' };
  }
}

/** 6) حذف سجلات client_error الأقدم من 30 يوماً */
export async function purgeOldClientErrors(): Promise<FixActionResult> {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error, count } = await supabase
      .from('access_log')
      .delete({ count: 'exact' })
      .eq('event_type', 'client_error')
      .lt('created_at', cutoff);
    if (error) throw error;
    await logAccessEvent({ event_type: 'diagnostics_run', metadata: { action: 'purge_old_client_errors', deleted: count ?? 0 } });
    return { ok: true, message: `تم حذف ${count ?? 0} خطأ عميل قديم (أقدم من 30 يوماً)` };
  } catch (e) {
    logger.error('[fix] purgeOldClientErrors:', e);
    return { ok: false, message: 'فشل حذف الأخطاء القديمة' };
  }
}

/** 7) اختبار latency لكل Edge Functions المسجّلة */
export async function testAllEdgeFunctions(): Promise<FixActionResult> {
  try {
    const { data, error } = await supabase.functions.invoke('diagnostics-edge-ping', { body: {} });
    if (error) throw error;
    const results = (data as { results?: Array<{ name: string; ok: boolean; latencyMs: number }> } | null)?.results ?? [];
    const okCount = results.filter((r) => r.ok).length;
    const avgLatency = results.length ? Math.round(results.reduce((s, r) => s + r.latencyMs, 0) / results.length) : 0;
    await logAccessEvent({ event_type: 'diagnostics_run', metadata: { action: 'test_edge_functions', okCount, total: results.length, avgLatency } });
    return {
      ok: okCount === results.length && results.length > 0,
      message: `${okCount}/${results.length} دالة تعمل • متوسط الاستجابة: ${avgLatency}ms`,
      details: results,
    };
  } catch (e) {
    logger.error('[fix] testAllEdgeFunctions:', e);
    return { ok: false, message: 'فشل اختبار Edge Functions' };
  }
}

/** 8) تصدير تقرير التشخيص كملف JSON */
export function exportDiagnosticsReport(payload: unknown, filename = 'diagnostics-report'): FixActionResult {
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const report = {
      generatedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      payload,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return { ok: true, message: 'تم تنزيل تقرير التشخيص' };
  } catch (e) {
    logger.error('[fix] exportDiagnosticsReport:', e);
    return { ok: false, message: 'فشل تصدير التقرير' };
  }
}
