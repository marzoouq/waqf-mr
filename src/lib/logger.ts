/**
 * Production-safe logger
 * في production: يُسكت كل شيء ما عدا الأخطاء الحرجة التي تُسجَّل في access_log
 * في development: يطبع كالمعتاد
 */
const isDev = import.meta.env.DEV;

/** Lazy import to avoid circular deps */
let _logAccess: ((e: { event_type: string; metadata?: Record<string, unknown> }) => Promise<void>) | null = null;
const getLogAccess = async () => {
  if (!_logAccess) {
    const mod = await import('@/hooks/useAccessLog');
    _logAccess = mod.logAccessEvent;
  }
  return _logAccess;
};

export const logger = {
  warn: (...args: unknown[]) => { if (isDev) console.warn(...args); },
  error: (...args: unknown[]) => {
    if (isDev) {
      console.error(...args);
    } else {
      console.error('[App Error]');
      // Record client error in access_log for monitoring
      const errObj = args.find(a => a instanceof Error) as Error | undefined;
      getLogAccess().then(log => log({
        event_type: 'client_error',
        metadata: {
          message: String(args[0] ?? '').substring(0, 500),
          stack: errObj?.stack?.substring(0, 1000),
          error_name: errObj?.name,
        },
      })).catch(() => {});
    }
  },
  info: (...args: unknown[]) => { if (isDev) console.info(...args); },
  log: (...args: unknown[]) => { if (isDev) console.log(...args); },
};
