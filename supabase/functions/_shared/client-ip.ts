/**
 * client-ip.ts — استخراج عنوان IP للزائر من ترويسات الوكيل.
 * مصدر وحيد للحقيقة (يمنع تكرار المنطق بين الدوال).
 */

/**
 * أولوية الترويسات: x-forwarded-for (أول عنوان) ← cf-connecting-ip ← x-real-ip.
 * @param maxLen الحد الأقصى لطول العنوان المُعاد (حماية من ترويسات ضخمة).
 */
export function extractClientIp(req: Request, maxLen = 64): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.substring(0, maxLen);
  }
  const fallback = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip");
  const trimmed = fallback?.trim();
  return trimmed ? trimmed.substring(0, maxLen) : null;
}
