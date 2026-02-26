/**
 * Production-safe logger
 * في production: يُسكت كل شيء لمنع كشف معلومات داخلية للمستخدم
 * في development: يطبع كالمعتاد
 */
const isDev = import.meta.env.DEV;

export const logger = {
  warn: (...args: unknown[]) => { if (isDev) console.warn(...args); },
  error: (...args: unknown[]) => { console.error(...args); },
  info: (...args: unknown[]) => { if (isDev) console.info(...args); },
  log: (...args: unknown[]) => { if (isDev) console.log(...args); },
};
 * في Production: يكتم warn/info/log لمنع كشف معلومات داخلية
 * لكن error يظل مرئياً دائماً لتشخيص مشاكل المستخدمين
 * في Development: يطبع كل شيء كالمعتاد
 */
const isDev = import.meta.env.DEV;

const noop = () => {};

export const logger = {
  warn: isDev ? (...args: unknown[]) => console.warn(...args) : noop,
  error: (...args: unknown[]) => console.error(...args),
  info: isDev ? (...args: unknown[]) => console.info(...args) : noop,
  log: isDev ? (...args: unknown[]) => console.log(...args) : noop,
};
