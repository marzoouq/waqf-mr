/**
 * Production-safe logger
 *
 * #31/#32 من تقرير الفحص — السلوك المقصود:
 *   - production: warn/info/log تُسكَت تماماً (لا ضوضاء في console للمستخدم)
 *   - production: error → errorReporter → access_log (pipeline موحّد للمراقبة)
 *   - development: كل المستويات تُطبع طبيعياً عبر console.*
 *
 * هذا تصميم متعمَّد: نريد قناة واحدة فقط للأخطاء في الإنتاج (errorReporter)
 * لتجنب تسرّب معلومات حسّاسة عبر console في متصفح المستخدم.
 */
import { reportClientError } from '@/lib/errorReporter';

const isDev = import.meta.env.DEV;

export const logger = {
  warn: (...args: unknown[]) => { if (isDev) console.warn(...args); },
  error: (...args: unknown[]) => {
    if (isDev) {
      console.error(...args);
    } else {
      console.error('[App Error]');
      // توحيد pipeline الأخطاء: logger → errorReporter → access_log
      const errObj = args.find(a => a instanceof Error) as Error | undefined;
      const message = errObj?.message || (typeof args[0] === 'string' ? args[0] : String(args[0] ?? 'unknown'));
      reportClientError({
        error_name: errObj?.name ?? 'UnknownError',
        error_message: message.substring(0, 500),
        error_stack: errObj?.stack?.substring(0, 1000) ?? null,
        component_stack: null,
        url: window.location?.href ?? null,
        user_agent: navigator.userAgent?.substring(0, 500) ?? null,
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    }
  },
  info: (...args: unknown[]) => { if (isDev) console.info(...args); },
  log: (...args: unknown[]) => { if (isDev) console.log(...args); },
};
