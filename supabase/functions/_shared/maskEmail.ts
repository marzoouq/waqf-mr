/**
 * يخفي PII في البريد الإلكتروني للاستخدام في السجلات (logs).
 * مثال: ahmed@example.com → a***@example.com
 * يحافظ على الدومين لأغراض التشخيص دون كشف الهوية الكاملة.
 */
export const maskEmail = (email: string | null | undefined): string => {
  if (!email || typeof email !== 'string') return '<unknown>';
  const atIdx = email.indexOf('@');
  if (atIdx <= 0) return '<invalid>';
  const local = email.slice(0, atIdx);
  const domain = email.slice(atIdx + 1);
  const first = local[0] ?? '*';
  return `${first}***@${domain}`;
};
