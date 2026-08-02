/**
 * سياق العميل — معرّف الجلسة (per-tab) وعنوان IP وحالة الحجب.
 *
 * معرّف الجلسة يُخزَّن في sessionStorage (تبويب واحد = جلسة واحدة).
 * عنوان IP يُجلب مرة واحدة من Edge Function `client-context` ويُخزَّن مؤقتاً.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

const SESSION_KEY = 'activity_session_id';
const IP_KEY = 'activity_client_ip';

export interface ClientContext {
  ip: string | null;
  blocked: boolean;
  blockReason: string | null;
}

let cached: ClientContext | null = null;
let inflight: Promise<ClientContext> | null = null;

/** معرّف جلسة ثابت لكل تبويب */
export const getSessionId = (): string => {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return 'no-session';
  }
};

/** عنوان IP المُخزَّن مؤقتاً (بدون طلب شبكة) */
export const getCachedIp = (): string | null => {
  if (cached?.ip) return cached.ip;
  try {
    return sessionStorage.getItem(IP_KEY);
  } catch {
    return null;
  }
};

/** جلب سياق العميل (IP + حالة الحجب) — مرة واحدة لكل جلسة */
export const resolveClientContext = async (force = false): Promise<ClientContext> => {
  if (!force && cached) return cached;
  if (!force && inflight) return inflight;

  inflight = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke('client-context', { body: {} });
      if (error) throw error;
      const ctx: ClientContext = {
        ip: (data as { ip?: string })?.ip ?? null,
        blocked: Boolean((data as { blocked?: boolean })?.blocked),
        blockReason: (data as { reason?: string })?.reason ?? null,
      };
      cached = ctx;
      try {
        if (ctx.ip) sessionStorage.setItem(IP_KEY, ctx.ip);
      } catch { /* noop */ }
      return ctx;
    } catch (e) {
      logger.warn('[clientContext] تعذّر جلب سياق العميل:', e instanceof Error ? e.message : e);
      const fallback: ClientContext = { ip: getCachedIp(), blocked: false, blockReason: null };
      cached = fallback;
      return fallback;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
};

/** إعادة الضبط — للاختبارات وبعد تسجيل الخروج */
export const resetClientContext = () => {
  cached = null;
  inflight = null;
};
