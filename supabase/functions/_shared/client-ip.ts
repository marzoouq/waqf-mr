/**
 * client-ip.ts — استخراج عنوان IP للزائر من ترويسات الوكيل.
 * مصدر وحيد للحقيقة (يمنع تكرار المنطق بين الدوال).
 */

/**
 * أولوية الترويسات: cf-connecting-ip (يضعه الوكيل ولا يتحكم به الزائر)
 * ← آخر عنوان في x-forwarded-for (أضافه الوكيل الموثوق) ← x-real-ip.
 * أول عنوان في x-forwarded-for يكتبه الزائر بنفسه فلا يُعتمد عليه.
 * @param maxLen الحد الأقصى لطول العنوان المُعاد (حماية من ترويسات ضخمة).
 */
export function extractClientIp(req: Request, maxLen = 64): string | null {
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf.substring(0, maxLen);
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last.substring(0, maxLen);
  }
  const real = req.headers.get("x-real-ip")?.trim();
  return real ? real.substring(0, maxLen) : null;
}
