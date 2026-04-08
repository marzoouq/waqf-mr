/**
 * دوال أمان مشتركة لوظائف الحافة
 */

/**
 * مقارنة آمنة ضد timing attack — constant-time بدون تسريب الطول
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  const maxLen = Math.max(aBytes.byteLength, bBytes.byteLength);
  const aPadded = new Uint8Array(maxLen);
  const bPadded = new Uint8Array(maxLen);
  aPadded.set(aBytes);
  bPadded.set(bBytes);
  let result = aBytes.byteLength ^ bBytes.byteLength;
  for (let i = 0; i < maxLen; i++) {
    result |= aPadded[i] ^ bPadded[i];
  }
  return result === 0;
}

/**
 * تحقق من أن التوكن هو service_role key
 */
export function isServiceRole(token: string): boolean {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return timingSafeEqual(token, serviceKey);
}
