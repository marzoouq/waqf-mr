/**
 * R1/W5-001 — استدعاء fetch آمن لخدمة ZATCA مع timeout + retry.
 *
 * يحلّ مشكلة تجمّد طلبات ZATCA عند بطء/انقطاع API الهيئة، التي كانت قد
 * تُجمّد instance الـ Edge Function حتى انتهاء حد التشغيل (cold-start).
 *
 * - timeoutMs الافتراضي 15 ثانية (ZATCA SLA الموثّق ~10s).
 * - retry exponential: 3 محاولات (0ms, 500ms, 1500ms).
 * - لا يُعيد عند 4xx (أخطاء عميل) — فقط شبكة/abort/5xx.
 */

export interface ZatcaFetchOptions extends RequestInit {
  /** Timeout per attempt in ms. Default 15000. */
  timeoutMs?: number;
  /** Total attempts including the first. Default 3. */
  attempts?: number;
}

const isRetriable = (status: number) =>
  status === 0 || status === 408 || status === 429 || status >= 500;

export async function zatcaFetch(
  url: string,
  options: ZatcaFetchOptions = {},
): Promise<Response> {
  const { timeoutMs = 15_000, attempts = 3, ...init } = options;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      // أخطاء عميل لا تستحق إعادة محاولة
      if (!isRetriable(res.status)) return res;
      if (attempt === attempts - 1) return res;
      lastError = new Error(`ZATCA ${res.status}`);
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (attempt === attempts - 1) throw err;
    }
    // backoff: 500ms, 1500ms
    await new Promise((r) => setTimeout(r, 500 * (2 ** attempt - 1) || 500));
  }
  throw lastError ?? new Error('zatcaFetch: exhausted retries');
}
