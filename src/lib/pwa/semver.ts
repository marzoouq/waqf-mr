/**
 * مقارنة semver مرنة لـ PWA changelog.
 * يعالج: lawاحق pre-release، NaN، مدخلات فارغة.
 */

/** يستخرج أول عدد صحيح من بداية المقطع، ويعيد 0 إن لم يوجد أو نتج NaN */
export function parsePart(s: string | undefined): number {
  const m = /^(\d+)/.exec(s ?? '');
  const n = m ? Number(m[1]) : 0;
  return Number.isFinite(n) ? n : 0;
}

/** هل يحتوي الإصدار على لاحقة pre-release (مثل -beta أو -rc.1)؟ */
export function hasPrerelease(v: string | undefined): boolean {
  return /-/.test(v ?? '');
}

/**
 * مقارنة semver محصّنة ضد:
 *  - اللواحق: "1.2.3-beta" → يُعامَل كأقل من "1.2.3"
 *  - NaN: أي مقطع غير رقمي يُعامَل كـ 0 بدل تخريب المقارنة
 *  - مدخلات فارغة/null/undefined: تُعامَل كـ "0.0.0"
 * يعيد >0 إذا a > b، <0 إذا a < b، 0 إذا متساويان.
 */
export function compareSemver(a: string, b: string): number {
  const sa = (a || '0.0.0').split('.');
  const sb = (b || '0.0.0').split('.');
  for (let i = 0; i < 3; i++) {
    const diff = parsePart(sa[i]) - parsePart(sb[i]);
    if (diff !== 0) return diff;
  }
  const pa = hasPrerelease(a);
  const pb = hasPrerelease(b);
  if (pa && !pb) return -1;
  if (!pa && pb) return 1;
  return 0;
}
