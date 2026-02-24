/**
 * Production-safe logger
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
