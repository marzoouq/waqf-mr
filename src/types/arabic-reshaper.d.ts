declare module 'arabic-reshaper' {
  /** تحويل النص العربي للأشكال المتصلة (Arabic Presentation Forms-B) */
  export function convertArabic(text: string): string;
  const ArabicReshaper: { convertArabic: typeof convertArabic };
  export default ArabicReshaper;
}
