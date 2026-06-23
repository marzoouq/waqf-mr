/**
 * استخراج آمن لرمز حالة HTTP من خطأ غير معروف
 * يُستخدم بدلاً من تكرار `(error as { status?: number })?.status`
 */
export const getErrorStatus = (error: unknown): number | undefined =>
  (error as { status?: number } | null | undefined)?.status;

/** فئة الخطأ — تحدد سياسة إعادة المحاولة وكيف يُبلَّغ المستخدم */
export type ErrorCategory =
  | 'auth'         // 401/403 — لا إعادة محاولة، يتولاها AuthContext
  | 'permission'   // 42501 Postgres — لا إعادة محاولة، خطأ صلاحيات
  | 'validation'   // 400 / 22xxx / 23xxx — لا إعادة محاولة، خطأ بيانات
  | 'rate_limit'   // 429 — إعادة محاولة مع backoff
  | 'network'      // TypeError fetch failed — إعادة محاولة
  | 'server'       // 5xx — إعادة محاولة
  | 'unknown';

export interface ClassifiedError {
  status?: number;
  code?: string;
  category: ErrorCategory;
  message?: string;
}

/** يصنف الخطأ إلى فئة معروفة لتوحيد سياسة إعادة المحاولة والإبلاغ */
export const classifyError = (error: unknown): ClassifiedError => {
  if (!error) return { category: 'unknown' };

  const e = error as { status?: number; code?: string; message?: string; name?: string };
  const status = e?.status;
  const code = e?.code;
  const message = e?.message;

  // network: fetch failed قبل أي استجابة
  if (e?.name === 'TypeError' && /fetch/i.test(message ?? '')) {
    // F3: في DEV — أخطاء CORS/preflight لا تُحلّ بإعادة المحاولة (إعداد البيئة)؛ صنّفها كـ validation لكسر retry loop
    if (
      import.meta.env.DEV &&
      /CORS|preflight|Access-Control|Failed to fetch|NetworkError/i.test(message ?? '')
    ) {
      return { status, code, category: 'validation', message };
    }
    return { status, code, category: 'network', message };
  }

  if (code === '42501') return { status, code, category: 'permission', message };
  if (code && /^(22|23)/.test(code)) return { status, code, category: 'validation', message };

  if (status === 401 || status === 403) return { status, code, category: 'auth', message };
  if (status === 429) return { status, code, category: 'rate_limit', message };
  if (status && status >= 400 && status < 500) return { status, code, category: 'validation', message };
  if (status && status >= 500) return { status, code, category: 'server', message };

  return { status, code, category: 'unknown', message };
};

/** هل يحق لنا إعادة المحاولة على هذه الفئة؟ */
export const isRetryableCategory = (category: ErrorCategory): boolean =>
  category === 'network' || category === 'server' || category === 'rate_limit';
