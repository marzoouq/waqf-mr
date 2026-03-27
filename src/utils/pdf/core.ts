import type jsPDF from 'jspdf';
import { reshapeArabic as rs } from './arabicReshaper';
export { reshapeArabic, reshapeRow } from './arabicReshaper';

// ═══ Re-exports من الملفات المقسّمة — يضمن عدم كسر أي import موجود ═══
export { toBase64, fetchFontWithRetry, loadArabicFont, isValidLogoUrl, loadLogoBase64 } from './pdfFonts';
export { addHeader, addHeaderToAllPages, addPageBorder, addFooter } from './pdfLayout';

/* PDF Core - Shared types, factory functions, table styles */

// دالة تنسيق التاريخ المشتركة
export const fmtDate = (d: string | null | undefined): string => {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('ar-SA'); }
  catch { return d; }
};

// Waqf info passed optionally to PDF generators
export interface PdfWaqfInfo {
  waqfName?: string;
  deedNumber?: string;
  court?: string;
  logoUrl?: string;
  vatNumber?: string;
  commercialReg?: string;
  address?: string;
  bankName?: string;
  bankAccount?: string;
  bankIBAN?: string;
}

// ═══ Factory Functions — توحيد إنشاء وإنهاء PDF ═══

export interface PdfDocResult {
  doc: jsPDF;
  fontFamily: string;
  startY: number;
}

/**
 * إنشاء مستند PDF جاهز مع خطوط عربية وترويسة
 */
export const createPdfDocument = async (
  waqfInfo?: PdfWaqfInfo,
  options?: ConstructorParameters<typeof jsPDF>[0]
): Promise<PdfDocResult> => {
  const { default: JsPDF } = await import('jspdf');
  const { loadArabicFont } = await import('./pdfFonts');
  const { addHeader } = await import('./pdfLayout');
  const doc = new JsPDF(options);
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';
  const startY = await addHeader(doc, fontFamily, waqfInfo);
  return { doc, fontFamily, startY };
};

/**
 * إنهاء وحفظ مستند PDF مع ترويسة الصفحات وتذييل
 */
export const finalizePdf = (
  doc: jsPDF,
  fontFamily: string,
  filename: string,
  waqfInfo?: PdfWaqfInfo,
  options?: { skipHeaders?: boolean }
) => {
  if (!options?.skipHeaders) {
    addHeaderToAllPages(doc, fontFamily, waqfInfo);
  }
  addFooter(doc, fontFamily, waqfInfo);
  doc.save(filename);
};

/**
 * عنوان قسم — نمط موحد لجميع عناوين الأقسام داخل PDF
 */
export const addSectionTitle = (
  doc: jsPDF,
  fontFamily: string,
  title: string,
  y: number,
  options?: { fontSize?: number; align?: 'center' | 'right' | 'left'; x?: number }
) => {
  const fontSize = options?.fontSize ?? 13;
  const align = options?.align ?? 'center';
  const x = options?.x ?? (align === 'right' ? 192 : 105);
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(fontSize);
  doc.text(rs(title), x, y, { align });
};

// Shared table styles
export const TABLE_HEAD_GREEN: [number, number, number] = [22, 101, 52];
export const TABLE_HEAD_GOLD: [number, number, number] = [202, 138, 4];
export const TABLE_HEAD_RED: [number, number, number] = [180, 40, 40];

export const baseTableStyles = (fontFamily: string) => ({
  styles: { halign: 'right' as const, font: fontFamily, fontStyle: 'normal' as const, cellPadding: 4 },
});

export const headStyles = (color: [number, number, number], fontFamily: string) => ({
  headStyles: { fillColor: color, font: fontFamily, fontStyle: 'bold' as const, cellPadding: 4 },
});

export const footStyles = (color: [number, number, number], fontFamily: string) => ({
  footStyles: { fillColor: color, font: fontFamily, fontStyle: 'bold' as const, cellPadding: 4 },
});

export interface UnitPdfRow {
  unit_number: string;
  unit_type: string;
  status: string;
  tenant_name: string | null;
  start_date: string | null;
  end_date: string | null;
  rent_amount: number | null;
  paid_months: number;
  payment_type?: string;
  payment_count?: number;
}
