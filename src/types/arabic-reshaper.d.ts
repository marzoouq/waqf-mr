/** تعريف أنواع لمكتبة arabic-reshaper */
declare module 'arabic-reshaper' {
  /** تحويل النص العربي إلى Arabic Presentation Forms-B (أشكال متصلة) */
  export function convertArabic(text: string): string;
}
