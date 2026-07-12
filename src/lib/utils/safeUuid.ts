/**
 * safeUuid — بديل آمن لـ crypto.randomUUID للمتصفحات الأقدم / السياقات غير الآمنة.
 * الترتيب: crypto.randomUUID → crypto.getRandomValues (RFC4122 v4) → Math.random.
 */
export function safeUuid(): string {
  const g = globalThis as { crypto?: Crypto };
  const c = g.crypto;

  if (c && typeof c.randomUUID === 'function') {
    try { return c.randomUUID(); } catch { /* fall through */ }
  }

  if (c && typeof c.getRandomValues === 'function') {
    try {
      const b = new Uint8Array(16);
      c.getRandomValues(b);
      b[6] = ((b[6] as number) & 0x0f) | 0x40; // version 4
      b[8] = ((b[8] as number) & 0x3f) | 0x80; // variant
      const h = Array.from(b, (x) => x.toString(16).padStart(2, '0'));
      return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10, 16).join('')}`;
    } catch { /* fall through */ }
  }

  // ملاذ أخير — ليس آمناً تشفيرياً لكن يمنع كسر الواجهة
  const rnd = () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
  return `${rnd()}${rnd()}-${rnd()}-4${rnd().slice(1)}-${((Math.random() * 4) | 8).toString(16)}${rnd().slice(1)}-${rnd()}${rnd()}${rnd()}`;
}
