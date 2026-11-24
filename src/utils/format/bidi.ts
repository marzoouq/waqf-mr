/**
 * Isolates a left-to-right token (e.g. fiscal-year label "2025-2026") inside Arabic text
 * so the browser never renders it reversed as "2026-2025".
 */
export function ltr(value: string | null | undefined): string {
  if (!value) return '';
  return `\u2066${value}\u2069`;
}

/** Isolates every fiscal-year label ("YYYY-YYYY") inside free Arabic text (e.g. stored notes). */
export function ltrYears(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/(?<!\u2066)\b(\d{4}-\d{4})\b/g, (m) => ltr(m));
}
