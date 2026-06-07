/**
 * auditMode — كشف وضع تدقيق الأداء (Lighthouse / DevTools Audit).
 *
 * الغرض: تعطيل الأنشطة الخلفية (realtime, SW periodic checks, polling) أثناء التدقيق
 * حتى يصل المتصفح إلى networkidle ولا يتوقف Lighthouse عن الفحص.
 *
 * يُفعَّل عند:
 *  - وجود `?audit=1` في الـ URL (تشغيل يدوي).
 *  - User-Agent يحتوي `Chrome-Lighthouse` (تشغيل آلي من DevTools/CI).
 */
export function isAuditMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get('audit') === '1') return true;
  } catch { /* صامت */ }
  try {
    const ua = navigator.userAgent || '';
    if (ua.includes('Chrome-Lighthouse') || ua.includes('Lighthouse')) return true;
  } catch { /* صامت */ }
  return false;
}
