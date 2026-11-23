/**
 * Long Arabic date label (Umm al-Qura Hijri + Gregorian) in Riyadh time — pure function.
 * يُستخدم في الشريط العلوي الموحّد؛ الأرقام لاتينية لتطابق بقية أرقام النظام.
 */
export interface TodayLabel {
  weekday: string;
  hijri: string;
  gregorian: string;
}

const TZ = 'Asia/Riyadh';

export function formatTodayLabel(date: Date): TodayLabel {
  if (Number.isNaN(date.getTime())) return { weekday: '', hijri: '', gregorian: '' };
  const weekday = new Intl.DateTimeFormat('ar-SA-u-nu-latn', { weekday: 'long', timeZone: TZ }).format(date);
  const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ,
  }).format(date);
  const gregorian = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ,
  }).format(date);
  return { weekday, hijri, gregorian };
}
