/**
 * Pure validation helpers for lookup-national-id.
 * دوال نقية قابلة للاختبار بدون شبكة — لا تعتمد على Supabase ولا على البيئة.
 */

/** تحويل الأرقام العربية-الهندية والفارسية إلى لاتينية ثم تنظيف المسافات. */
export function normalizeDigits(raw: string): string {
  return raw
    .replace(/[٠-٩]/g, (d: string) => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48))
    .replace(/[۰-۹]/g, (d: string) => String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 48))
    .trim();
}

/** رقم الهوية السعودي: 10 أرقام تبدأ بـ 1 (مواطن) أو 2 (مقيم) مع Luhn معدّل. */
export function isValidSaudiNationalId(id: string): boolean {
  if (!/^[12]\d{9}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const digit = Number(id[i]);
    if (i % 2 === 0) {
      const doubled = digit * 2;
      const s = doubled.toString().padStart(2, "0");
      sum += Number(s[0]) + Number(s[1]);
    } else {
      sum += digit;
    }
  }
  return sum % 10 === 0;
}

/** SHA-256 hex digest — يُستخدم كمفتاح rate limit دون تسريب الرقم الفعلي. */
export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** إخفاء البريد: "user@example.com" → "u***@example.com" */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***@***";
  const visible = local.slice(0, Math.max(1, Math.ceil(local.length * 0.3)));
  return `${visible}***@${domain}`;
}
