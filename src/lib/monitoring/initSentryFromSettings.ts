/**
 * ربط logger.error و errorReporter بـ Sentry في الإنتاج.
 * يُستدعى مرة واحدة عند الإقلاع بعد قراءة DSN من الإعدادات.
 */
import { supabase } from '@/integrations/supabase/client';
import { initSentry } from '@/lib/monitoring/sentry';
import { logger } from '@/lib/logger';

let started = false;

/** قراءة DSN من app_settings ثم تهيئة Sentry (بدون كسر الإقلاع عند الفشل) */
export const initSentryFromSettings = async (): Promise<boolean> => {
  if (started) return true;
  started = true;
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'sentry_dsn')
      .maybeSingle();
    return await initSentry(data?.value ?? null);
  } catch (e) {
    logger.warn('[sentry] تعذّر قراءة DSN:', e instanceof Error ? e.message : e);
    return await initSentry(null);
  }
};
