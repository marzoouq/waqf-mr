/**
 * أدوات تعقيم قيم فلاتر PostgREST `.or()`
 * تمنع حقن صيغة الفلتر (الفاصلة، الأقواس، علامات التنصيص، النقطتان، الشرطة المائلة).
 */
const RESERVED = /[,()"\\:]/g;

/** Strips PostgREST filter syntax chars; keeps `%` wildcards already present in a built pattern. */
export function sanitizeOrPattern(pattern: string): string {
  return pattern.replace(RESERVED, ' ').slice(0, 200);
}

/** Builds a safe `%term%` ilike pattern from raw user input (escapes wildcards too). */
export function toSafeIlikePattern(raw: string): string {
  const cleaned = raw.trim().replace(RESERVED, ' ').replace(/[%_]/g, (m) => `\\${m}`).slice(0, 200);
  return `%${cleaned}%`;
}
