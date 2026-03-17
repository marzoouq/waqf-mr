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
  // تقسيم النص إلى أجزاء: عربية وغير عربية
  type Segment = { text: string; isRTL: boolean };
  const segments: Segment[] = [];
  let current = '';
  let currentIsRTL = false;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const charIsArabic = isArabicChar(code);

    // التشكيل والمسافة تتبع السياق الحالي
    if (isNeutralChar(code)) {
      current += text[i];
      continue;
    }

    if (current.length > 0 && charIsArabic !== currentIsRTL) {
      segments.push({ text: current, isRTL: currentIsRTL });
      current = '';
    }

    currentIsRTL = charIsArabic;
    current += text[i];
  }

  if (current.length > 0) {
    segments.push({ text: current, isRTL: currentIsRTL });
  }

  // بناء النص النهائي:
  // - عكس ترتيب الأجزاء (لأن الاتجاه العام RTL)
  // - الأجزاء العربية: لا تعكس داخلياً (لأنها ستُعكس مع الترتيب العام)
  // - الأجزاء اللاتينية/الرقمية: تبقى كما هي
  //
  // الطريقة: نعكس كل النص حرفاً حرفاً، ثم نعيد ترتيب الأجزاء اللاتينية
  const fullText = segments.map(s => s.text).join('');
  const reversed = fullText.split('').reverse().join('');

  // إذا لم يكن هناك نص لاتيني/رقمي، نرجع النص المعكوس مباشرة
  const hasLTR = segments.some(s => !s.isRTL);
  if (!hasLTR) return reversed;

  // إعادة ترتيب الأجزاء اللاتينية/الرقمية داخل النص المعكوس
  // نبحث عنها ونعيد عكسها لتظهر بالترتيب الصحيح
  let result = reversed;
  for (const seg of segments) {
    if (!seg.isRTL && seg.text.trim().length > 0) {
      const reversedSeg = seg.text.split('').reverse().join('');
      // نجد الجزء المعكوس في النص ونستبدله بالأصل
      const idx = result.indexOf(reversedSeg);
      if (idx !== -1) {
        result = result.substring(0, idx) + seg.text + result.substring(idx + reversedSeg.length);
      }
    }
  }

  return result;
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
