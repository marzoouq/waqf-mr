/**
 * طبقة API موحّدة فوق supabase.rpc
 * - توقيت تلقائي عبر startPerfTimer
 * - تصنيف الأخطاء (auth/permission/validation/network/rate_limit/server)
 * - إعادة محاولة مع exponential backoff للفئات القابلة فقط
 *
 * استخدام:
 *   import { rpc } from '@/lib/api/rpc';
 *   const data = await rpc('get_dashboard_kpis', { p_year: 2024 });
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

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface RpcOptions {
  /** عدد المحاولات الكلي (تشمل المحاولة الأولى). الافتراضي 3 */
  maxAttempts?: number;
  /** علامة label مخصصة لـ perf timer (الافتراضي: rpc:<name>) */
  label?: string;
}

/**
 * استدعاء RPC موحّد مع retry/backoff/تصنيف خطأ.
 * يُلقي ApiError عند الفشل النهائي.
 */
export async function rpc<T = unknown>(
  fnName: string,
  params?: Record<string, unknown>,
  options: RpcOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;
  const stopTimer = startPerfTimer(options.label ?? `rpc:${fnName}`);
  let lastError: unknown;

  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)(fnName, params);
      if (!error) {
        if (import.meta.env.DEV && data !== null && data !== undefined) {
          try { recordPayloadSize(`rpc:${fnName}:response`, JSON.stringify(data).length); } catch { /* noop */ }
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
      await sleep(delay);
    }
    // غير قابل للوصول منطقياً
    throw new ApiError(classifyError(lastError), lastError);
  } finally {
    stopTimer();
  }
}
