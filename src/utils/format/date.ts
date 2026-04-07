/**
 * دوال مساعدة لتنسيق التواريخ
 */

/** تنسيق تاريخ ميلادي بصيغة يوم/شهر/سنة */
export function toGregorianShort(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${Number(parts[2])}/${Number(parts[1])}/${parts[0]}`;
  } catch {
    return dateStr;
  }
}
