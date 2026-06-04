/**
 * طبقة API موحّدة فوق supabase.functions.invoke
 * - توقيت تلقائي عبر startPerfTimer
 * - تصنيف الأخطاء (transport-level + data.error fallback)
 * - retry مع exponential backoff للفئات القابلة فقط
 * - onAuthError callback (لاستبدال نمط signOut اليدوي بشكل اختياري)
 * - مراقبة حجم الحمولة في DEV
 *
 * استخدام:
 *   import { invoke } from '@/lib/api/invoke';
 *   const data = await invoke<MyResponse>('dashboard-summary', { body: { ... } });
 */
import { supabase } from '@/integrations/supabase/client';
import { classifyError, isRetryableCategory } from '@/utils/error/getErrorStatus';
import { startPerfTimer } from '@/lib/monitoring/queryMonitor';
import { recordPayloadSize } from '@/lib/monitoring/payloadMonitor';
import { logger } from '@/lib/logger';
import { ApiError } from './rpc';

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [250, 500, 1000];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface InvokeRequest {
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface InvokeOptions {
  /** عدد المحاولات الكلي (تشمل الأولى). الافتراضي 3 */
  maxAttempts?: number;
  /** label مخصص لـ perf timer (الافتراضي invoke:<name>) */
  label?: string;
  /** يُستدعى عند خطأ مصادقة 401 — مكان مناسب لـ signOut */
  onAuthError?: (error: ApiError) => void | Promise<void>;
  /**
   * هل نُحوّل data.error الموجود في الاستجابة إلى ApiError؟ الافتراضي true.
   * Edge Functions كثيرة ترجع 200 + { error: '...' } بدلاً من رمز HTTP.
   */
  treatDataErrorAsFailure?: boolean;
}

interface InvokeRawResult<T> {
  data: T | null;
  error: { message?: string; status?: number; name?: string } | null;
}

/**
 * استدعاء Edge Function موحّد. يُلقي ApiError عند الفشل النهائي.
 */
export async function invoke<T = unknown>(
  fnName: string,
  request: InvokeRequest = {},
  options: InvokeOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;
  const treatDataErrorAsFailure = options.treatDataErrorAsFailure ?? true;
  const stopTimer = startPerfTimer(options.label ?? `invoke:${fnName}`);

  // مراقبة حجم body المرسَل (DEV فقط)
  if (import.meta.env.DEV && request.body !== undefined) {
    try {
      const size = JSON.stringify(request.body).length;
      recordPayloadSize(`invoke:${fnName}:request`, size);
    } catch {
      /* circular ref — تجاهل */
    }
  }

  let lastError: unknown;

  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const result = (await (supabase.functions.invoke as (
        name: string,
        req: InvokeRequest,
      ) => Promise<InvokeRawResult<T>>)(fnName, request));
      const { data, error } = result;

      // 1) خطأ نقل مباشر (شبكة، 4xx/5xx من runtime)
      if (error) {
        lastError = error;
        // FunctionsHttpError لا يحمل status صريحاً دائماً — نستخرجه من message إن لزم
        const status = error.status ?? extractStatusFromMessage(error.message);
        const enriched = status ? { ...error, status } : error;
        const classified = classifyError(enriched);

        if (classified.category === 'auth') {
          const apiErr = new ApiError(classified, enriched);
          // إشعار افتراضي بانتهاء الجلسة (lib/ مسموح له بـ toast)
          const { uiNotify } = await import('@/lib/notify');
          uiNotify.error('انتهت الجلسة، يُرجى تسجيل الدخول من جديد');
          if (options.onAuthError) await options.onAuthError(apiErr);
          throw apiErr;
        }

        if (!isRetryableCategory(classified.category) || attempt === maxAttempts) {
          throw new ApiError(classified, enriched);
        }

        const delay = BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)] ?? 1000;
        logger.warn(
          `[invoke] إعادة محاولة ${fnName} (${attempt}/${maxAttempts}) بعد ${delay}ms — ${classified.category}`,
        );
        await sleep(delay);
        continue;
      }

      // 2) data.error — نمط Edge Functions ترجع 200 + خطأ في الجسم
      if (treatDataErrorAsFailure && data && typeof data === 'object' && 'error' in data) {
        const dataError = (data as { error?: unknown }).error;
        if (dataError) {
          const message = typeof dataError === 'string' ? dataError : JSON.stringify(dataError);
          // unauthorized صراحةً
          const isUnauth = /unauthorized|401|invalid.*(token|jwt)/i.test(message);
          const synthetic = isUnauth
            ? { message, status: 401 }
            : { message, status: 400 };
          const classified = classifyError(synthetic);

          if (classified.category === 'auth') {
            const apiErr = new ApiError(classified, synthetic);
            const { uiNotify } = await import('@/lib/notify');
            uiNotify.error('انتهت الجلسة، يُرجى تسجيل الدخول من جديد');
            if (options.onAuthError) await options.onAuthError(apiErr);
            throw apiErr;
          }

          throw new ApiError(classified, synthetic);
        }
      }

      // 3) نجاح — مراقبة حجم الاستجابة
      if (import.meta.env.DEV && data !== null && data !== undefined) {
        try {
          const size = JSON.stringify(data).length;
          recordPayloadSize(`invoke:${fnName}:response`, size);
        } catch {
          /* تجاهل */
        }
      }

      return data as T;
    }
    throw new ApiError(classifyError(lastError), lastError);
  } finally {
    stopTimer();
  }
}

/** يستخرج رمز HTTP من رسالة FunctionsHttpError إذا وُجد */
function extractStatusFromMessage(message?: string): number | undefined {
  if (!message) return undefined;
  const m = message.match(/\b(4\d{2}|5\d{2})\b/);
  return m ? Number(m[1]) : undefined;
}
