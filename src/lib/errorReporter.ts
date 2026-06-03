/**
 * مُبلّغ الأخطاء — يرسل أخطاء العميل إلى الخادم
 * مستخرج من ErrorBoundary لفصل منطق البيانات عن UI
 */
import { supabase } from '@/integrations/supabase/client';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { safeGet, safeSet } from '@/lib/storage';
import { sanitizeErrorMetadata } from '@/lib/diagnostics/sanitizeErrorMetadata';


interface ErrorMetadata {
  error_name: string;
  error_message: string;
  error_stack: string | null;
  component_stack: string | null;
  url: string | null;
  user_agent: string | null;
  timestamp: string;
}

/** dedupe — يمنع تكرار نفس الخطأ خلال نافذة قصيرة */
const DEDUPE_WINDOW_MS = 5000;
const recentErrors = new Map<string, number>();

function shouldReport(metadata: ErrorMetadata): boolean {
  const key = `${metadata.error_name}::${metadata.url ?? ''}`;
  const now = Date.now();
  const last = recentErrors.get(key);
  if (last && now - last < DEDUPE_WINDOW_MS) return false;
  recentErrors.set(key, now);
  // تنظيف بسيط — احتفظ بآخر 50 إدخالاً فقط
  if (recentErrors.size > 50) {
    const oldest = [...recentErrors.entries()].sort((a, b) => a[1] - b[1])[0]?.[0];
    if (oldest) recentErrors.delete(oldest);
  }
  return true;
}

/**
 * إرسال خطأ عميل إلى الخادم عبر RPC
 * مع fallback للتخزين المحلي في حال عدم توفر الاتصال
 *
 * ملاحظة معمارية: نستدعي supabase.rpc مباشرة (بدلاً من lib/api/rpc) عمداً.
 * lib/api/rpc يسجّل تحذيرات ويسجّل أخطاءه عبر logger، وlogger قد يستدعي
 * reportClientError مرة أخرى — مما يخلق recursion. هذا المسار يجب أن يبقى
 * منخفض المستوى وصامتاً.
 */
export async function reportClientError(metadata: ErrorMetadata): Promise<void> {
  if (!shouldReport(metadata)) return;
  try {
    await supabase.rpc('log_access_event', {
      p_event_type: 'client_error',
      p_target_path: metadata.url ?? undefined,
      p_device_info: metadata.user_agent ?? undefined,
      p_metadata: {
        error_name: metadata.error_name,
        error_message: metadata.error_message,
        error_stack: metadata.error_stack,
        component_stack: metadata.component_stack,
        url: metadata.url,
        user_agent: metadata.user_agent,
        timestamp: metadata.timestamp,
      },
    });
  } catch {
    // Supabase غير متاح — حفظ محلياً كـ fallback
    try {
      const sessionId = (globalThis as Record<string, unknown>).__ERROR_SESSION_ID ??= crypto.randomUUID();
      const queue: unknown[] = safeGet(STORAGE_KEYS.ERROR_LOG_QUEUE, [] as unknown[]);
      queue.push({ ...metadata, session_id: sessionId, logged_at: new Date().toISOString() });
      if (queue.length > 20) queue.shift();
      safeSet(STORAGE_KEYS.ERROR_LOG_QUEUE, queue);
    } catch { /* التخزين ممتلئ أو غير متاح */ }
  }
}
