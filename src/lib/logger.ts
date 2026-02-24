/**
 * Production-safe logger
 * في Production: يكتم كل شيء لمنع كشف معلومات داخلية
 * في Development: يطبع كالمعتاد
 */
const isDev = import.meta.env.DEV;

const noop = () => {};

export const logger = {
  warn: isDev ? (...args: unknown[]) => console.warn(...args) : noop,
  error: isDev ? (...args: unknown[]) => console.error(...args) : noop,
  info: isDev ? (...args: unknown[]) => console.info(...args) : noop,
  log: isDev ? (...args: unknown[]) => console.log(...args) : noop,
};
