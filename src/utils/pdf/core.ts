import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
export { reshapeArabic, reshapeRow } from './arabicReshaper';

/* PDF Core - Shared types, font loading, header/footer, table styles */

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

// Module-level font cache to avoid re-fetching on every PDF generation
let fontCache: { regular: string; bold: string } | null = null;

const toBase64 = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// جلب خط واحد مع إعادة محاولة عند الفشل
const fetchFontWithRetry = async (url: string, retries = 2): Promise<string> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { cache: 'force-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const buf = await res.arrayBuffer();
      if (buf.byteLength < 1000) throw new Error(`Font file too small (${buf.byteLength} bytes) — likely corrupt`);
      return toBase64(buf);
    } catch (e) {
      if (attempt === retries) throw e;
      // انتظار قصير قبل إعادة المحاولة
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw new Error('Unreachable');
};

// Helper to load and register Amiri Arabic font (with caching + retry)
export const loadArabicFont = async (doc: jsPDF) => {
  try {
    if (!fontCache) {
      const [regular, bold] = await Promise.all([
        fetchFontWithRetry('/fonts/Amiri-Regular.ttf'),
        fetchFontWithRetry('/fonts/Amiri-Bold.ttf'),
      ]);

      fontCache = { regular, bold };
    }

    doc.addFileToVFS('Amiri-Regular.ttf', fontCache.regular);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal', 'Identity-H');

    doc.addFileToVFS('Amiri-Bold.ttf', fontCache.bold);
    doc.addFont('Amiri-Bold.ttf', 'Amiri', 'bold', 'Identity-H');

    doc.setFont('Amiri');
    doc.setLanguage('ar');
    return true;
  } catch (e) {
    // مسح الكاش التالف لإعادة المحاولة في المرة القادمة
    fontCache = null;
    logger.error('Failed to load Arabic fonts for PDF:', e);
    toast.error('تعذر تحميل الخطوط العربية — قد يظهر PDF بشكل غير صحيح');
    doc.setFont('helvetica');
    return false;
  }
};

// M-06 fix: validate logoUrl before fetching — allow relative paths, same-origin, and Supabase Storage URLs
const isValidLogoUrl = (url: string): boolean => {
  if (url.startsWith('/')) return true; // relative path
  try {
    const parsed = new URL(url);
    if (parsed.origin === window.location.origin) return true;
    if (parsed.hostname.endsWith('.supabase.co')) return true;
    return false;
  } catch {
    return false;
  }
};

// Load logo as base64 data URL for embedding in PDF
export const loadLogoBase64 = async (url: string): Promise<string | null> => {
  try {
    if (!isValidLogoUrl(url)) {
      logger.warn('Blocked external logo URL in PDF generation:', url);
      return null;
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

// Professional header with logo, waqf name, deed info, and gold separator
export const addHeader = async (doc: jsPDF, fontFamily: string, waqfInfo?: PdfWaqfInfo): Promise<number> => {
  if (!waqfInfo?.waqfName) return 15; // no header, return default startY

  const { reshapeArabic: rs } = await import('./arabicReshaper');
  const pageW = doc.internal.pageSize.width;
  const margin = 18;
  let currentY = 14;

  // Try to load and add logo
  if (waqfInfo.logoUrl) {
    const logoData = await loadLogoBase64(waqfInfo.logoUrl);
    if (logoData) {
      try {
        doc.addImage(logoData, 'PNG', pageW - margin - 22, currentY - 6, 22, 22);
      } catch {
        // logo failed, continue without it
      }
    }
  }

  // Waqf name - centered bold
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(16);
  doc.text(rs(waqfInfo.waqfName), pageW / 2, currentY + 4, { align: 'center' });
  currentY += 12;

  // Deed info - smaller text below name
  const deedParts: string[] = [];
  if (waqfInfo.deedNumber) deedParts.push(waqfInfo.deedNumber);
  if (waqfInfo.court) deedParts.push(waqfInfo.court);

  if (deedParts.length > 0) {
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(9);
    doc.text(rs(deedParts.join('  -  ')), pageW / 2, currentY + 2, { align: 'center' });
    currentY += 8;
  }

  // VAT registration number
  if (waqfInfo.vatNumber) {
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(8);
    doc.text(rs(`الرقم الضريبي: ${waqfInfo.vatNumber}`), pageW / 2, currentY + 2, { align: 'center' });
    currentY += 7;
  }

  // Gold separator line
  doc.setDrawColor(202, 138, 4);
  doc.setLineWidth(0.8);
  doc.line(margin, currentY + 2, pageW - margin, currentY + 2);
  currentY += 8;

  return currentY;
};

// Add header to all pages (for multi-page documents created by autoTable)
export const addHeaderToAllPages = (doc: jsPDF, fontFamily: string, waqfInfo?: PdfWaqfInfo) => {
  if (!waqfInfo?.waqfName) return;
  const pageCount = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.width;
  const margin = 18;

  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    // Simplified header for continuation pages (no logo loading needed)
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(11);
    doc.text(waqfInfo.waqfName, pageW / 2, 12, { align: 'center' });
    doc.setDrawColor(202, 138, 4);
    doc.setLineWidth(0.5);
    doc.line(margin, 16, pageW - margin, 16);
  }
};

// Decorative border with outer gold frame, inner green frame, and corner ornaments
export const addPageBorder = (doc: jsPDF) => {
  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;

  // Outer gold frame (1.5pt) at 8mm from edge
  doc.setDrawColor(202, 138, 4);
  doc.setLineWidth(1.5);
  doc.rect(8, 8, pageW - 16, pageH - 16);

  // Inner green frame (0.5pt) at 11mm from edge
  doc.setDrawColor(22, 101, 52);
  doc.setLineWidth(0.5);
  doc.rect(11, 11, pageW - 22, pageH - 22);

  // Corner ornaments – small gold filled squares at four corners
  doc.setFillColor(202, 138, 4);
  const cs = 3; // corner square size
  // Top-left
  doc.rect(8, 8, cs, cs, 'F');
  // Top-right
  doc.rect(pageW - 8 - cs, 8, cs, cs, 'F');
  // Bottom-left
  doc.rect(8, pageH - 8 - cs, cs, cs, 'F');
  // Bottom-right
  doc.rect(pageW - 8 - cs, pageH - 8 - cs, cs, cs, 'F');
};

export const addFooter = (doc: jsPDF, fontFamily: string, waqfInfo?: PdfWaqfInfo) => {
  const pageCount = doc.getNumberOfPages();
  const now = new Date();
  const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
  const pageW = doc.internal.pageSize.width;
  const margin = 18;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.height;
    const footerY = pageH - 14;

    // Add decorative border to every page
    addPageBorder(doc);

    // Gray separator line
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 5, pageW - margin, footerY - 5);

    doc.setFontSize(8);
    doc.setFont(fontFamily, 'normal');

    // Date on left
    doc.text(dateStr, margin, footerY, { align: 'left' });

    // Waqf name in center (short version)
    if (waqfInfo?.waqfName) {
      doc.text(waqfInfo.waqfName, pageW / 2, footerY, { align: 'center' });
    }

    // Page number on right
    doc.text(`${i} / ${pageCount}`, pageW - margin, footerY, { align: 'right' });
  }
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
