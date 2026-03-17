/**
 * معالج النص العربي لـ jsPDF
 * يحل مشكلة الحروف المنفصلة وترتيب RTL
 * 
 * jsPDF لا يدعم Arabic Shaping أصلاً — هذا الملف يحوّل النص العربي
 * إلى Arabic Presentation Forms B (أشكال متصلة) ثم يعكس ترتيب الأحرف
 * للعرض الصحيح RTL.
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — المكتبة لا تحتوي على تعريفات TypeScript
import ArabicReshaper from 'arabic-reshaper';

// نطاقات Unicode للحروف العربية والتشكيل
const isArabicChar = (code: number): boolean =>
  (code >= 0x0600 && code <= 0x06FF) || // Arabic
  (code >= 0x0750 && code <= 0x077F) || // Arabic Supplement
  (code >= 0x08A0 && code <= 0x08FF) || // Arabic Extended-A
  (code >= 0xFB50 && code <= 0xFDFF) || // Arabic Presentation Forms-A
  (code >= 0xFE70 && code <= 0xFEFF);   // Arabic Presentation Forms-B

// هل النص يحتوي على حروف عربية؟
const hasArabic = (text: string): boolean => {
  for (let i = 0; i < text.length; i++) {
    if (isArabicChar(text.charCodeAt(i))) return true;
  }
  return false;
};

/**
 * عكس ترتيب أحرف النص مع الحفاظ على الأرقام والنصوص اللاتينية
 * يعالج النص المختلط (عربي + إنجليزي + أرقام) بشكل صحيح
 */
const reverseBidi = (text: string): string => {
  // تقسيم النص إلى أجزاء: عربية وغير عربية
  const segments: { text: string; isArabic: boolean }[] = [];
  let current = '';
  let currentIsArabic = false;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const charIsArabic = isArabicChar(code);
    // التشكيل والمسافة تتبع السياق الحالي
    const isNeutral = code === 0x20 || (code >= 0x0610 && code <= 0x061A) ||
      (code >= 0x064B && code <= 0x065F) || code === 0x0670;

    if (isNeutral) {
      current += text[i];
      continue;
    }

    if (current.length > 0 && charIsArabic !== currentIsArabic) {
      segments.push({ text: current, isArabic: currentIsArabic });
      current = '';
    }

    currentIsArabic = charIsArabic;
    current += text[i];
  }

  if (current.length > 0) {
    segments.push({ text: current, isArabic: currentIsArabic });
  }

  // عكس ترتيب الأجزاء (RTL) وعكس الحروف العربية داخل كل جزء
  const reversed = segments.reverse().map(seg => {
    if (seg.isArabic) {
      // عكس الحروف العربية فقط
      return seg.text.split('').reverse().join('');
    }
    return seg.text;
  });

  return reversed.join('');
};

/**
 * تحويل النص العربي للعرض الصحيح في jsPDF
 * 1. تشكيل الحروف (Arabic Shaping) — تحويل لأشكال متصلة
 * 2. عكس الترتيب (RTL) — لأن jsPDF يرسم LTR
 * 
 * النصوص غير العربية تمرّ بدون تعديل
 */
export const reshapeArabic = (text: string): string => {
  if (!text || !hasArabic(text)) return text;

  try {
    // الخطوة 1: تشكيل الحروف — تحويل للأشكال المتصلة
    const shaped = ArabicReshaper.convertArabic(text);

    // الخطوة 2: عكس الترتيب للعرض الصحيح RTL في jsPDF
    return reverseBidi(shaped);
  } catch {
    // في حالة خطأ — إرجاع النص الأصلي
    return text;
  }
};

/**
 * نسخة مُحسّنة تعالج مصفوفة نصوص (لجداول autoTable)
 */
export const reshapeRow = (row: string[]): string[] =>
  row.map(cell => reshapeArabic(cell));
