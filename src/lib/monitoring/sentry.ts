/**
 * تكامل Sentry — تهيئة اختيارية في الإنتاج.
 *
 * مصدر DSN: مفتاح `sentry_dsn` في `app_settings` (يضبطه الناظر من مركز التشخيص)،
 * أو المتغير `VITE_SENTRY_DSN` إن وُجد. بدون DSN لا يتم تحميل Sentry إطلاقاً.
 */
import { logger } from '@/lib/logger';

let initialized = false;
let activeDsn: string | null = null;

export const isSentryActive = () => initialized;
export const getSentryDsnMasked = () =>
  activeDsn ? `${activeDsn.slice(0, 16)}…${activeDsn.slice(-6)}` : null;

/** تهيئة Sentry مرة واحدة */
export const initSentry = async (dsn: string | null | undefined): Promise<boolean> => {
  if (initialized) return true;
  const value = (dsn || (import.meta.env.VITE_SENTRY_DSN as string | undefined) || '').trim();
  if (!value || !/^https?:\/\//.test(value)) return false;

  try {
    const Sentry = await import('@sentry/react');
    Sentry.init({
      dsn: value,
      environment: import.meta.env.PROD ? 'production' : 'development',
      tracesSampleRate: 0.1,
      replaysOnErrorSampleRate: 0,
      replaysSessionSampleRate: 0,
      sendDefaultPii: false,
      beforeSend: (event) => {
        // لا نرسل بيانات شخصية: نحذف عنوان البريد وعناوين IP
        if (event.user) {
          delete event.user.email;
          delete event.user.ip_address;
        }
        return event;
      },
    });
    initialized = true;
    activeDsn = value;
    return true;
  } catch (e) {
    logger.warn('[sentry] فشل التهيئة:', e instanceof Error ? e.message : e);
    return false;
  }
};

/** إرسال استثناء إلى Sentry إن كان مفعّلاً */
export const captureSentryException = (error: unknown, context?: Record<string, unknown>) => {
  if (!initialized) return;
  void import('@sentry/react').then((Sentry) => {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  }).catch(() => { /* noop */ });
};

/** ربط هوية المستخدم (المعرّف فقط — بدون بريد) */
export const setSentryUser = (userId: string | null, role?: string | null) => {
  if (!initialized) return;
  void import('@sentry/react').then((Sentry) => {
    Sentry.setUser(userId ? { id: userId, ...(role ? { role } : {}) } : null);
  }).catch(() => { /* noop */ });
};

/** اختبار التكامل — يرسل استثناء تجريبي */
export const sendSentryTestEvent = () => {
  if (!initialized) return false;
  captureSentryException(new Error('Sentry test event — من مركز التشخيص'), { source: 'diagnostics' });
  return true;
};
