/**
 * مُبلّغ الأخطاء — يرسل أخطاء العميل إلى الخادم
 * مستخرج من ErrorBoundary لفصل منطق البيانات عن UI
 */
import { supabase } from '@/integrations/supabase/client';
import { STORAGE_KEYS } from '@/constants/storageKeys';

interface ErrorMetadata {
  error_name: string;
  error_message: string;
  error_stack: string | null;
  component_stack: string | null;
  url: string | null;
  user_agent: string | null;
  timestamp: string;
}

/**
 * إرسال خطأ عميل إلى الخادم عبر RPC
 * مع fallback للتخزين المحلي في حال عدم توفر الاتصال
 */
export async function reportClientError(metadata: ErrorMetadata): Promise<void> {
  try {
    await supabase.rpc('log_access_event', {
      p_event_type: 'client_error',
      p_target_path: metadata.url ?? undefined,
      p_device_info: metadata.user_agent ?? undefined,
      p_metadata: metadata as unknown as Record<string, unknown>,
    });
  } catch {
    // Supabase غير متاح — حفظ محلياً كـ fallback
    try {
      const sessionId = (globalThis as Record<string, unknown>).__ERROR_SESSION_ID ??= crypto.randomUUID();
      const queue = JSON.parse(localStorage.getItem(STORAGE_KEYS.ERROR_LOG_QUEUE) || '[]');
      queue.push({ ...metadata, session_id: sessionId, logged_at: new Date().toISOString() });
      if (queue.length > 20) queue.shift();
      localStorage.setItem(STORAGE_KEYS.ERROR_LOG_QUEUE, JSON.stringify(queue));
    } catch { /* التخزين ممتلئ أو غير متاح */ }
  }
}
