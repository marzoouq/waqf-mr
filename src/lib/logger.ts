/**
 * Production-safe logger
 * في production: يُسكت كل شيء ما عدا الأخطاء الحرجة التي تُسجَّل في access_log
 * في development: يطبع كالمعتاد
 */
import { logAccessEvent } from '@/hooks/useAccessLog';

const isDev = import.meta.env.DEV;

export const logger = {
  warn: (...args: unknown[]) => { if (isDev) console.warn(...args); },
  error: (...args: unknown[]) => {
    if (isDev) {
      console.error(...args);
    } else {
      console.error('[App Error]');
      // Record client error in access_log for monitoring
      const errObj = args.find(a => a instanceof Error) as Error | undefined;
      logAccessEvent({
        event_type: 'client_error',
        metadata: {
          message: String(args[0] ?? '').substring(0, 500),
          error_name: errObj?.name,
        },
      }).catch(() => {});
    }
  },
  info: (...args: unknown[]) => { if (isDev) console.info(...args); },
  log: (...args: unknown[]) => { if (isDev) console.log(...args); },
};
