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

// هل الحرف محايد (مسافة أو تشكيل)؟
const isNeutralChar = (code: number): boolean =>
  code === 0x20 ||
  (code >= 0x0610 && code <= 0x061A) ||
  (code >= 0x064B && code <= 0x065F) ||
  code === 0x0670;

// هل النص يحتوي على حروف عربية؟
const hasArabic = (text: string): boolean => {
  for (let i = 0; i < text.length; i++) {
    if (isArabicChar(text.charCodeAt(i))) return true;
  }
  return false;
};

/**
 * عكس ترتيب النص للعرض في jsPDF (الذي يرسم LTR)
 * 
 * المنطق الصحيح:
 * - النص العربي بعد reshape يكون بترتيب منطقي (يمين→يسار)
 * - jsPDF يرسم كل الأحرف من اليسار لليمين
 * - لذلك نحتاج عكس النص الكامل
 * - لكن الأرقام والنصوص اللاتينية يجب أن تبقى بترتيبها الأصلي (LTR)
 * - الحل: عكس كل شيء، ثم إعادة عكس الأجزاء اللاتينية/الرقمية داخلياً
 */
const reverseBidi = (text: string): string => {
  // تقسيم النص إلى كلمات (بالمسافات)
  const words = text.split(' ');

  // عكس ترتيب الكلمات فقط — الحروف داخل كل كلمة تبقى كما هي
  // هذا يحافظ على اتصال Presentation Forms-B
  const reversed = words.reverse();

  return reversed.join(' ');
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
