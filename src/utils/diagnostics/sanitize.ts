/**
 * تنقية البيانات الحساسة من نصوص التشخيص
 * مستقل عن maskData — يحذف كلياً بدل الإخفاء الجزئي
 */

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const JWT_RE = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const PHONE_RE = /(?:\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g;
const NATIONAL_ID_RE = /\b[12]\d{9}\b/g;

export function sanitizeDiagnosticOutput(text: string): string {
  return text
    .replace(JWT_RE, '[JWT]')
    .replace(EMAIL_RE, '[EMAIL]')
    .replace(UUID_RE, '[UUID]')
    .replace(NATIONAL_ID_RE, '[NATIONAL_ID]')
    .replace(PHONE_RE, '[PHONE]');
}
