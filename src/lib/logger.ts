/**
 * Production-safe logger
 * في production: يُسكت كل شيء لمنع كشف معلومات داخلية للمستخدم
 * في development: يطبع كالمعتاد
 */
const isDev = import.meta.env.DEV;

export const logger = {
  warn: (...args: unknown[]) => { if (isDev) console.warn(...args); },
  error: (...args: unknown[]) => { if (isDev) console.error(...args); },
  info: (...args: unknown[]) => { if (isDev) console.info(...args); },
  log: (...args: unknown[]) => { if (isDev) console.log(...args); },
};