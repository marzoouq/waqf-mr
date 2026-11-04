/**
 * تفقيط المبالغ بالعربية (كتابة الرقم بالحروف) — دالة نقية.
 */
const ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
const TEENS = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const HUNDREDS = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

function below1000(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h) parts.push(HUNDREDS[h] ?? '');
  if (r >= 10 && r < 20) parts.push(TEENS[r - 10] ?? '');
  else if (r) {
    const o = r % 10;
    const t = Math.floor(r / 10);
    if (o) parts.push(ONES[o] ?? '');
    if (t) parts.push(TENS[t] ?? '');
  }
  return parts.join(' و');
}

/** صيغة الوحدة الكبرى (ألف/مليون/مليار) حسب العدد */
function scaleWord(count: number, singular: string, dual: string, plural: string, accusative: string): string {
  if (count === 1) return singular;
  if (count === 2) return dual;
  if (count >= 3 && count <= 10) return `${below1000(count)} ${plural}`;
  return `${below1000(count)} ${accusative}`;
}

const SCALES: Array<[number, string, string, string, string]> = [
  [1_000_000_000, 'مليار', 'ملياران', 'مليارات', 'ملياراً'],
  [1_000_000, 'مليون', 'مليونان', 'ملايين', 'مليوناً'],
  [1_000, 'ألف', 'ألفان', 'آلاف', 'ألفاً'],
];

export function numberToArabicWords(value: number): string {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return 'صفر';
  const parts: string[] = [];
  for (const [size, s, d, p, a] of SCALES) {
    const count = Math.floor(n / size);
    if (count) {
      parts.push(scaleWord(count, s, d, p, a));
      n %= size;
    }
  }
  if (n) parts.push(below1000(n));
  return parts.join(' و');
}

/** المبلغ بالريال والهللات مع عبارة "فقط لا غير" */
export function amountToArabicWords(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.abs(amount) : 0;
  const riyals = Math.floor(safe);
  const halalas = Math.round((safe - riyals) * 100);
  let text = `${numberToArabicWords(riyals)} ريالاً سعودياً`;
  if (halalas > 0) text += ` و${numberToArabicWords(halalas)} هللة`;
  return `${text} فقط لا غير`;
}
