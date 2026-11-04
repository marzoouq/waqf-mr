/**
 * تخطيط PDF — الترويسة والتذييل والحدود الزخرفية — مستخرج من core.ts
 */
import type jsPDF from 'jspdf';
import { reshapeArabic as rs } from './arabicReshaper';
import { loadLogoBase64 } from './pdfFonts';
import { getPdfThemeColors } from './themeColors';
import type { PdfWaqfInfo } from './core';

// ترويسة احترافية مع شعار واسم الوقف وخط ذهبي فاصل
export const addHeader = async (doc: jsPDF, fontFamily: string, waqfInfo?: PdfWaqfInfo): Promise<number> => {
  if (!waqfInfo?.waqfName) return 15;

  const pageW = doc.internal.pageSize.width;
  const margin = 18;
  let currentY = 14;

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

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(16);
  doc.text(rs(waqfInfo.waqfName), pageW / 2, currentY + 4, { align: 'center' });
  currentY += 12;

  const deedParts: string[] = [];
  if (waqfInfo.deedNumber) deedParts.push(waqfInfo.deedNumber);
  if (waqfInfo.court) deedParts.push(waqfInfo.court);

  if (deedParts.length > 0) {
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(9);
    doc.text(rs(deedParts.join('  -  ')), pageW / 2, currentY + 2, { align: 'center' });
    currentY += 8;
  }

  if (waqfInfo.vatNumber) {
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(8);
    doc.text(rs(`الرقم الضريبي: ${waqfInfo.vatNumber}`), pageW / 2, currentY + 2, { align: 'center' });
    currentY += 7;
  }

  const themeColors = getPdfThemeColors();
  doc.setDrawColor(...themeColors.secondary);
  doc.setLineWidth(0.8);
  doc.line(margin, currentY + 2, pageW - margin, currentY + 2);
  currentY += 8;

  return currentY;
};

// إضافة الترويسة لجميع الصفحات (للمستندات متعددة الصفحات)
export const addHeaderToAllPages = (doc: jsPDF, fontFamily: string, waqfInfo?: PdfWaqfInfo) => {
  if (!waqfInfo?.waqfName) return;

  const themeColors = getPdfThemeColors();
  const pageCount = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.width;
  const margin = 18;

  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(11);
    doc.text(rs(waqfInfo.waqfName), pageW / 2, 12, { align: 'center' });
    doc.setDrawColor(...themeColors.secondary);
    doc.setLineWidth(0.5);
    doc.line(margin, 16, pageW - margin, 16);
  }
};

// حدود زخرفية: إطار ذهبي خارجي + إطار أخضر داخلي + زخارف الأركان
export const addPageBorder = (doc: jsPDF) => {
  const themeColors = getPdfThemeColors();
  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;

  doc.setDrawColor(...themeColors.secondary);
  doc.setLineWidth(1.5);
  doc.rect(8, 8, pageW - 16, pageH - 16);

  doc.setDrawColor(...themeColors.primary);
  doc.setLineWidth(0.5);
  doc.rect(11, 11, pageW - 22, pageH - 22);

  doc.setFillColor(...themeColors.secondary);
  const cs = 3;
  doc.rect(8, 8, cs, cs, 'F');
  doc.rect(pageW - 8 - cs, 8, cs, cs, 'F');
  doc.rect(8, pageH - 8 - cs, cs, cs, 'F');
  doc.rect(pageW - 8 - cs, pageH - 8 - cs, cs, cs, 'F');
};

// تذييل مع التاريخ واسم الوقف ورقم الصفحة
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

    addPageBorder(doc);

    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 5, pageW - margin, footerY - 5);

    doc.setFontSize(8);
    doc.setFont(fontFamily, 'normal');
    doc.text(dateStr, margin, footerY, { align: 'left' });

    if (waqfInfo?.waqfName) {
      doc.text(rs(waqfInfo.waqfName), pageW / 2, footerY, { align: 'center' });
    }

    doc.text(`${i} / ${pageCount}`, pageW - margin, footerY, { align: 'right' });
  }
};

/** سجل أقسام كل مستند لبناء فهرس المحتويات */
const sectionRegistry = new WeakMap<jsPDF, { title: string; page: number }[]>();

export const getRegisteredSections = (doc: jsPDF) => sectionRegistry.get(doc) ?? [];

/**
 * Start a report section on its own page (skips when the current page is still empty)
 * and register it for the table of contents.
 */
export const startSectionPage = (doc: jsPDF, topY: number, currentY: number, title?: string): number => {
  let y = currentY;
  if (currentY > topY + 1) {
    doc.addPage();
    y = topY;
  }
  if (title) {
    const list = sectionRegistry.get(doc) ?? [];
    list.push({ title, page: doc.getNumberOfPages() });
    sectionRegistry.set(doc, list);
  }
  return y;
};

/**
 * Insert a table-of-contents page at the start when the document has 3+ registered sections.
 * Returns true when a page was inserted.
 */
export const insertTableOfContents = (doc: jsPDF, fontFamily: string, topY = 40): boolean => {
  const sections = getRegisteredSections(doc);
  if (sections.length < 3) return false;
  doc.insertPage(1);
  doc.setPage(1);
  const pageW = doc.internal.pageSize.width;
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(16);
  doc.text(rs('فهرس المحتويات'), pageW / 2, topY, { align: 'center' });
  doc.setFontSize(11);
  let y = topY + 14;
  sections.forEach((s, i) => {
    doc.setFont(fontFamily, 'normal');
    doc.text(rs(`${i + 1}. ${s.title}`), pageW - 25, y, { align: 'right' });
    doc.text(String(s.page + 1), 25, y, { align: 'left' });
    doc.setDrawColor(200, 200, 200);
    doc.line(35, y + 1.5, pageW - 25 - doc.getTextWidth(rs(`${i + 1}. ${s.title}`)) - 3, y + 1.5);
    y += 9;
  });
  sectionRegistry.delete(doc);
  return true;
};
