/**
 * ألوان PDF موحدة مع الثيم النشط
 * يقرأ متغيرات CSS من :root ويحولها إلى RGB tuples لاستخدامها مع jsPDF
 *
 * يحافظ على fallback للألوان الكلاسيكية (ذهبي/أخضر) للتوافق العكسي
 * عند تشغيل التوليد في بيئات بدون DOM (SSR, Edge Functions)
 */

export type RgbTuple = [number, number, number];

export interface PdfThemeColors {
  /** اللون الأساسي — يقابل --primary (الأخضر افتراضياً) */
  primary: RgbTuple;
  /** اللون الثانوي — يقابل --secondary (الذهبي افتراضياً) */
  secondary: RgbTuple;
  /** الأحمر للتنبيهات والمتأخرات */
  destructive: RgbTuple;
}

/** ألوان احتياطية تطابق التصميم الكلاسيكي للوقف */
export const DEFAULT_PDF_COLORS: PdfThemeColors = {
  primary: [22, 101, 52],   // أخضر إسلامي
  secondary: [202, 138, 4], // ذهبي
  destructive: [180, 40, 40],
};

/**
 * يحوّل قيمة HSL نصية ("142 71% 24%") إلى RGB tuple
 * يدعم كلا الصيغتين: مفصول بمسافات (Tailwind v4) أو فاصلات
 */
export function hslStringToRgb(hslStr: string | undefined | null): RgbTuple | null {
  if (!hslStr) return null;
  const cleaned = hslStr.trim().replace(/,/g, ' ').replace(/%/g, '');
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length < 3) return null;

  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;

  if (Number.isNaN(h) || Number.isNaN(s) || Number.isNaN(l)) return null;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;

  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60) { r1 = c; g1 = x; b1 = 0; }
  else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
  else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }

  return [
    Math.round((r1 + m) * 255),
    Math.round((g1 + m) * 255),
    Math.round((b1 + m) * 255),
  ];
}

/**
 * يقرأ ألوان الثيم النشط من document.documentElement
 * يعيد الافتراضي إذا كان DOM غير متاح أو القراءة فشلت
 */
export function getPdfThemeColors(): PdfThemeColors {
  if (typeof document === 'undefined' || typeof getComputedStyle === 'undefined') {
    return DEFAULT_PDF_COLORS;
  }

  try {
    const styles = getComputedStyle(document.documentElement);
    const primary = hslStringToRgb(styles.getPropertyValue('--primary'));
    const secondary = hslStringToRgb(styles.getPropertyValue('--secondary'));
    const destructive = hslStringToRgb(styles.getPropertyValue('--destructive'));

    return {
      primary: primary ?? DEFAULT_PDF_COLORS.primary,
      secondary: secondary ?? DEFAULT_PDF_COLORS.secondary,
      destructive: destructive ?? DEFAULT_PDF_COLORS.destructive,
    };
  } catch {
    return DEFAULT_PDF_COLORS;
  }
}
