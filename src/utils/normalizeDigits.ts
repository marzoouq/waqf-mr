/** تحويل الأرقام العربية-الهندية (٠-٩) والفارسية (۰-۹) إلى أرقام لاتينية */
export function normalizeArabicDigits(str: string): string {
  return str
    .replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48))
    .replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 48))
    .trim();
}
