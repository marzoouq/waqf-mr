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
 * تحويل النص العربي للعرض الصحيح في jsPDF
 * تشكيل الحروف فقط (Arabic Presentation Forms-B) —
 * عارض الـ PDF يتكفل بترتيب RTL عند استخدام Identity-H encoding
 * 
 * النصوص غير العربية تمرّ بدون تعديل
 */
export const reshapeArabic = (text: string): string => {
  if (!text || !hasArabic(text)) return text;

  try {
    // تشكيل الحروف — تحويل للأشكال المتصلة
    // PDF viewer يتكفل بـ RTL مع Identity-H encoding
    return ArabicReshaper.convertArabic(text);
  } catch {
    // في حالة خطأ — إرجاع النص الأصلي
    return text;
  }
};

/**
 * نسخة مُحسّنة تعالج مصفوفة عناصر جدول autoTable
 * تدعم: string, number, وكائنات { content, styles, colSpan, ... }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const reshapeRow = (row: any[]): any[] =>
  row.map(cell => {
    if (cell == null) return cell;
    if (typeof cell === 'number') return cell;
    if (typeof cell === 'string') return reshapeArabic(cell);
    if (typeof cell === 'object' && 'content' in cell) {
      return { ...cell, content: typeof cell.content === 'string' ? reshapeArabic(cell.content) : cell.content };
    }
    return cell;
  });
