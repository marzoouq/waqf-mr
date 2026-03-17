/**
 * أدوات تصدير CSV موحدة مع دعم RTL ومنع CSV Injection
 */

/** محارف Unicode اتجاهية */
const RLM = '\u200F'; // Right-to-Left Mark
const LRM = '\u200E'; // Left-to-Right Mark

/** نمط يطابق النصوص العربية */
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/** نمط يطابق القيم التي قد تُستغل كصيغ في Excel */
const FORMULA_RE = /^[=+\-@\t\r]/;

/**
 * تنظيف قيمة لمنع CSV Injection
 * يضيف فاصلة عليا قبل القيم التي تبدأ بأحرف صيغ
 */
export function sanitizeCsvValue(val: string): string {
  if (FORMULA_RE.test(val)) {
    return "'" + val;
  }
  return val;
}

/**
 * تطبيع اتجاه النص لعرض صحيح في Excel
 * - القيم العربية/المختلطة: تُغلّف بعلامة RLM
 * - الأرقام والتواريخ والمعرفات: تُغلّف بعلامة LRM
 */
export function normalizeCsvDirection(val: string): string {
  if (!val) return val;
  if (ARABIC_RE.test(val)) {
    return RLM + val + RLM;
  }
  return LRM + val + LRM;
}

/**
 * بناء محتوى CSV من مصفوفة كائنات
 * يضيف BOM لدعم العربية في Excel ويطبّق معالجة الاتجاه والحماية
 */
export function buildCsv(
  data: Record<string, unknown>[],
  columnOrder?: string[],
): string {
  if (!data.length) return '';

  const headers = columnOrder ?? Object.keys(data[0]);

  const headerRow = headers
    .map(h => `"${normalizeCsvDirection(h).replace(/"/g, '""')}"`)
    .join(',');

  const rows = data.map(row =>
    headers
      .map(h => {
        const raw = row[h];
        const str = raw === null || raw === undefined ? '' : String(raw);
        const safe = sanitizeCsvValue(str);
        const directed = normalizeCsvDirection(safe);
        return `"${directed.replace(/"/g, '""')}"`;
      })
      .join(','),
  );

  // BOM لدعم العربية في Excel
  return '\uFEFF' + [headerRow, ...rows].join('\n');
}

/**
 * بناء CSV من عناوين ومصفوفة صفوف (للاستخدام من SupportDashboardPage وما شابه)
 */
export function buildCsvFromRows(
  headers: string[],
  rows: (string | null | undefined)[][],
): string {
  const headerRow = headers
    .map(h => `"${normalizeCsvDirection(h).replace(/"/g, '""')}"`)
    .join(',');

  const dataRows = rows.map(r =>
    r
      .map(c => {
        const str = c ?? '';
        const safe = sanitizeCsvValue(str);
        const directed = normalizeCsvDirection(safe);
        return `"${directed.replace(/"/g, '""')}"`;
      })
      .join(','),
  );

  return '\uFEFF' + [headerRow, ...dataRows].join('\n');
}

/** تحميل ملف CSV */
export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
