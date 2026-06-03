/**
 * Date-only helpers — بدون مكوّن وقت ولا منطقة زمنية.
 *
 * المشكلة: استخدام `new Date().toISOString().slice(0,10)` يعطي تاريخاً
 * بـ UTC، وهو متقدم/متأخر بساعة عن التوقيت المحلي قرب منتصف الليل
 * — مما يُسبب أخطاء off-by-one في فلترة المتأخرات والتقارير اليومية.
 *
 * هذه الأدوات نقيّة وتستخدم التوقيت المحلي حصراً.
 */

const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

/** تاريخ اليوم بالتنسيق YYYY-MM-DD بالتوقيت المحلي */
export function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** تحويل YYYY-MM-DD إلى Date محلي بمنتصف الليل (00:00) */
export function parseDateOnlyLocal(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/**
 * مقارنة تاريخين بصيغة YYYY-MM-DD:
 *  - سالب إذا a < b
 *  - صفر  إذا a === b
 *  - موجب إذا a > b
 */
export function compareDateOnly(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** الفرق بالأيام التقويمية بين تاريخين (b - a). يتجاهل المكوّن الزمني. */
export function diffCalendarDays(a: string, b: string): number {
  const da = parseDateOnlyLocal(a).getTime();
  const db = parseDateOnlyLocal(b).getTime();
  return Math.round((db - da) / 86_400_000);
}
