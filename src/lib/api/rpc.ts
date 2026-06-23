/**
 * طبقة API موحّدة فوق supabase.rpc
 * - توقيت تلقائي عبر startPerfTimer
 * - تصنيف الأخطاء (auth/permission/validation/network/rate_limit/server)
 * - إعادة محاولة مع exponential backoff للفئات القابلة فقط
 * - دعم AbortSignal من TanStack Query: عند الإلغاء نتوقف فوراً
 *   ونرمي AbortError (يتجاهلها TanStack Query بصمت ولا تُحفظ كخطأ).
 *
 * استخدام:
 *   import { rpc } from '@/lib/api/rpc';
 *   queryFn: ({ signal }) => rpc('get_dashboard_kpis', { p_year: 2024 }, { signal })
 */
import { supabase } from '@/integrations/supabase/client';
import { classifyError, type ClassifiedError, isRetryableCategory } from '@/utils/error/getErrorStatus';
import { startPerfTimer } from '@/lib/monitoring/queryMonitor';
import { recordPayloadSize } from '@/lib/monitoring/payloadMonitor';
import { logger } from '@/lib/logger';

/** كائن الخطأ الموحّد المُلقى من rpc() */
export class ApiError extends Error {
  readonly category: ClassifiedError['category'];
  readonly status?: number;
  readonly code?: string;
  readonly cause?: unknown;

  constructor(classified: ClassifiedError, cause: unknown) {
    super(classified.message ?? 'API error');
    this.name = 'ApiError';
    this.category = classified.category;
    this.status = classified.status;
    this.code = classified.code;
    this.cause = cause;
  }
}

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [250, 500, 1000];

/** نوم قابل للإلغاء — يُرفض بـ AbortError إذا أُلغي signal */
function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function isAbortError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  const e = err as { name?: string; message?: string };
  return e?.name === 'AbortError' || /aborted/i.test(e?.message ?? '');
}

export interface RpcOptions {
  /** عدد المحاولات الكلي (تشمل المحاولة الأولى). الافتراضي 3 */
  maxAttempts?: number;
  /** علامة label مخصصة لـ perf timer (الافتراضي: rpc:<name>) */
  label?: string;
  /** إشارة إلغاء من TanStack Query أو AbortController يدوي */
  signal?: AbortSignal;
}

/**
 * استدعاء RPC موحّد مع retry/backoff/تصنيف خطأ.
 * يُلقي ApiError عند الفشل النهائي، أو AbortError عند الإلغاء.
 */
export async function rpc<T = unknown>(
  fnName: string,
  params?: Record<string, unknown>,
  options: RpcOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;
  const signal = options.signal;
  const stopTimer = startPerfTimer(options.label ?? `rpc:${fnName}`);
  let lastError: unknown;

  // إلغاء مسبق — لا تبدأ الطلب أصلاً
  if (signal?.aborted) {
    stopTimer();
    throw new DOMException('Aborted', 'AbortError');
  }

  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Cast through unknown because supabase.rpc is heavily generic over fnName literal unions.
      // ملاحظة: supabase-js v2 لا يدعم signal مباشرة على .rpc؛ نعتمد على فحص signal
      // بين المحاولات وقبل/بعد الـ await لمنع استكمال callback بعد الإلغاء.
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        p?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message?: string; status?: number; name?: string } | null }>)(fnName, params);

      // إذا أُلغي الاستعلام أثناء الجلب، توقّف فوراً قبل أي معالجة
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      if (!error) {
        if (import.meta.env.DEV && data !== null && data !== undefined) {
          // تأجيل JSON.stringify إلى idle لتجنّب حجب main thread على الحمولات الكبيرة
          try {
            const schedule: (cb: () => void) => void =
              typeof (globalThis as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback === 'function'
                ? (cb) => (globalThis as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(cb)
                : (cb) => setTimeout(cb, 0);
            schedule(() => {
              try {
                const s = JSON.stringify(data);
                if (s.length < 100_000) recordPayloadSize(`rpc:${fnName}:response`, s.length);
              } catch { /* noop */ }
            });
          } catch { /* noop */ }
        }
        return data as T;
      }

      lastError = error;
      const classified = classifyError(error);

      if (!isRetryableCategory(classified.category) || attempt === maxAttempts) {
        throw new ApiError(classified, error);
      }

      const delay = BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)] ?? 1000;
      logger.warn(`[rpc] إعادة محاولة ${fnName} (${attempt}/${maxAttempts}) بعد ${delay}ms — ${classified.category}`);
      await abortableSleep(delay, signal);
    }
    // غير قابل للوصول منطقياً
    throw new ApiError(classifyError(lastError), lastError);
  } catch (err) {
    // أعِد رمي AbortError كما هي — TanStack Query يتعامل معها بصمت
    if (isAbortError(err)) throw err;
    throw err;
  } finally {
    stopTimer();
  }
}
