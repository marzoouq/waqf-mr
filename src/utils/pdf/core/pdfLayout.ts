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
