/**
 * تخطيط PDF — الترويسة والتذييل والحدود الزخرفية — مستخرج من core.ts
 */
import type jsPDF from 'jspdf';
import { reshapeArabic as rs } from './arabicReshaper';
import { loadLogoBase64 } from './pdfFonts';
import { getPdfThemeColors } from './themeColors';
import { formatHijriGregorian } from '@/utils/format/hijriDate';
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

  // فاصل الهوية: خط برونزي عريض يليه خط أخضر رفيع
  const themeColors = getPdfThemeColors();
  doc.setDrawColor(...themeColors.secondary);
  doc.setLineWidth(0.9);
  doc.line(margin, currentY + 2, pageW - margin, currentY + 2);
  doc.setDrawColor(...themeColors.primary);
  doc.setLineWidth(0.25);
  doc.line(margin, currentY + 3.6, pageW - margin, currentY + 3.6);
  currentY += 9;

  return currentY;
};

// ترويسة مختصرة لبقية الصفحات (الصفحة ذات الترويسة الكاملة تُستثنى)
export const addHeaderToAllPages = (doc: jsPDF, fontFamily: string, waqfInfo?: PdfWaqfInfo, fullHeaderPage = 1) => {
  if (!waqfInfo?.waqfName) return;

  const themeColors = getPdfThemeColors();
  const pageCount = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.width;
  const margin = 18;

  for (let i = 1; i <= pageCount; i++) {
    if (i === fullHeaderPage) continue;
    doc.setPage(i);
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...themeColors.primary);
    doc.text(rs(waqfInfo.waqfName), pageW - margin, 15, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(...themeColors.secondary);
    doc.setLineWidth(0.5);
    doc.line(margin, 17.5, pageW - margin, 17.5);
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

/**
 * يرسم جملة عربية مختلطة بالأرقام كقطع منفصلة بترتيب القراءة (من اليمين)،
 * فلا ينعكس ترتيب الأرقام كما يحدث عند تشكيل الجملة دفعة واحدة.
 */
const drawRtlSegments = (doc: jsPDF, segments: string[], x: number, y: number, anchor: 'left' | 'right') => {
  const gap = doc.getTextWidth(' ');
  const parts = segments.map((seg) => (/[\u0600-\u06FF]/.test(seg) ? rs(seg) : seg));
  const total = parts.reduce((w, p) => w + doc.getTextWidth(p), 0) + gap * (parts.length - 1);
  let cursor = anchor === 'right' ? x : x + total;
  for (const part of parts) {
    doc.text(part, cursor, y, { align: 'right' });
    cursor -= doc.getTextWidth(part) + gap;
  }
};

/** تاريخ اليوم بتوقيت الرياض (YYYY-MM-DD) */
const riyadhToday = (now: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

// تذييل موحّد: تاريخ الطباعة هجري/ميلادي، اسم الوقف، ورقم الصفحة
export const addFooter = (doc: jsPDF, fontFamily: string, waqfInfo?: PdfWaqfInfo) => {
  const pageCount = doc.getNumberOfPages();
  const dates = formatHijriGregorian(riyadhToday(new Date()));
  const hijriNum = dates.hijri.replace(/\s*هـ$/, '');
  const dateSegments = ['طُبع في', hijriNum, 'هـ', '-', dates.gregorian, 'م'];
  const themeColors = getPdfThemeColors();
  const pageW = doc.internal.pageSize.width;
  const margin = 18;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.height;
    const footerY = pageH - 14;

    addPageBorder(doc);

    doc.setDrawColor(...themeColors.secondary);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 5, pageW - margin, footerY - 5);

    doc.setFontSize(8);
    doc.setFont(fontFamily, 'normal');
    doc.setTextColor(90, 90, 90);
    drawRtlSegments(doc, dateSegments, margin, footerY, 'left');

    if (waqfInfo?.waqfName) {
      doc.text(rs(waqfInfo.waqfName), pageW / 2, footerY, { align: 'center' });
    }

    drawRtlSegments(doc, ['صفحة', String(i), 'من', String(pageCount)], pageW - margin, footerY, 'right');
    doc.setTextColor(0, 0, 0);
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
