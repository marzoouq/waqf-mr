/**
 * التاريخ بالهجري (أم القرى) والميلادي معاً — دالة نقية.
 */
export interface DualDate {
  gregorian: string;
  hijri: string;
}

export function formatHijriGregorian(dateStr: string): DualDate {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr ?? '');
  if (!m) return { gregorian: '-', hijri: '-' };
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  if (Number.isNaN(d.getTime())) return { gregorian: '-', hijri: '-' };
  const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const year = get('year').replace(/\D/g, '');
  return {
    gregorian: `${m[1]}/${m[2]}/${m[3]}`,
    hijri: `${year}/${get('month').padStart(2, '0')}/${get('day').padStart(2, '0')} هـ`,
  };
}
