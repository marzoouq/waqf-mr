/**
 * أدوات تصدير Excel (XLSX) باستخدام XML مباشر — بدون مكتبة خارجية
 * يدعم RTL والعربية مع أسماء أعمدة وصفوف بيانات
 * بنية ZIP+CRC مستخرجة في `xlsxZip.ts`.
 */
import { createZipBlob } from './xlsxZip';

/** تحويل رقم عمود إلى حرف (0→A, 1→B, ..., 25→Z, 26→AA) */
function colLetter(n: number): string {
  let s = '';
  let num = n;
  while (num >= 0) {
    s = String.fromCharCode((num % 26) + 65) + s;
    num = Math.floor(num / 26) - 1;
  }
  return s;
}

/** هروب XML */
function escXml(val: string): string {
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * حماية من Formula Injection — يُسبق القيم النصية التي تبدأ
 * بـ = + - @ \t \r بـ ' حتى لا تُفسَّر كصيغ في Excel.
 */
export function sanitizeXlsxCell(val: string): string {
  if (!val) return val;
  const first = val.charAt(0);
  if (first === '=' || first === '+' || first === '-' || first === '@' || first === '\t' || first === '\r') {
    return `'${val}`;
  }
  return val;
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** ورقة واحدة داخل مصنف متعدد الأوراق */
export interface XlsxSheet {
  name: string;
  data: Record<string, unknown>[];
}

/** بناء XML لورقة واحدة */
function buildSheetXml(data: Record<string, unknown>[], selected: boolean): string {
  const headers = Object.keys(data[0] ?? {});
  const headerCells = headers.map((h, i) =>
    `<c r="${colLetter(i)}1" t="inlineStr"><is><t>${escXml(h)}</t></is></c>`
  ).join('');
  const dataRows = data.map((row, ri) => {
    const rowNum = ri + 2;
    const cells = headers.map((h, ci) => {
      const raw = row[h];
      const val = raw === null || raw === undefined ? '' : String(raw);
      const num = Number(val);
      if (val !== '' && !isNaN(num) && isFinite(num)) {
        return `<c r="${colLetter(ci)}${rowNum}"><v>${num}</v></c>`;
      }
      return `<c r="${colLetter(ci)}${rowNum}" t="inlineStr"><is><t>${escXml(sanitizeXlsxCell(val))}</t></is></c>`;
    }).join('');
    return `<row r="${rowNum}">${cells}</row>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView rightToLeft="true"${selected ? ' tabSelected="1"' : ''} workbookViewId="0"/></sheetViews>
<sheetData>
<row r="1">${headerCells}</row>
${dataRows}
</sheetData>
</worksheet>`;
}

/** تنظيف اسم الورقة وفق قيود Excel (31 حرفاً بلا رموز محظورة) */
export function sanitizeSheetName(name: string, index: number): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31);
  return cleaned || `ورقة ${index + 1}`;
}

/** بناء مصنف XLSX متعدد الأوراق — ورقة لكل جدول */
export function buildXlsxWorkbook(sheets: XlsxSheet[]): Blob {
  const valid = sheets.filter((s) => s.data.length > 0);
  if (!valid.length) return new Blob([], { type: XLSX_MIME });

  const sheetEntries = valid.map((s, i) => `<sheet name="${escXml(sanitizeSheetName(s.name, i))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('');
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${sheetEntries}</sheets>
</workbook>`;
  const relEntries = valid.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('\n');
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${relEntries}
</Relationships>`;
  const overrides = valid.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n');
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${overrides}
</Types>`;
  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  return createZipBlob([
    { path: '[Content_Types].xml', content: contentTypes },
    { path: '_rels/.rels', content: relsXml },
    { path: 'xl/workbook.xml', content: workbookXml },
    { path: 'xl/_rels/workbook.xml.rels', content: workbookRels },
    ...valid.map((s, i) => ({ path: `xl/worksheets/sheet${i + 1}.xml`, content: buildSheetXml(s.data, i === 0) })),
  ]);
}

/** بناء ملف XLSX من ورقة واحدة */
export function buildXlsx(data: Record<string, unknown>[]): Blob {
  return buildXlsxWorkbook([{ name: 'بيانات', data }]);
}

/** تحميل ملف XLSX */
export function downloadXlsx(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
