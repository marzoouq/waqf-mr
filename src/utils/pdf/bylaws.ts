import jsPDF from 'jspdf';
import {
  PdfWaqfInfo, loadArabicFont, addHeader, addHeaderToAllPages, addFooter,
  TABLE_HEAD_GREEN, TABLE_HEAD_GOLD,
  baseTableStyles, headStyles,
} from './core';
import autoTable from 'jspdf-autotable';

export interface BylawPdfEntry {
  part_number: number;
  part_title: string;
  chapter_title: string | null;
  content: string;
}

/**
 * Strip markdown syntax for plain-text PDF rendering.
 * Handles headers, bold, italic, lists, links, and extra whitespace.
 */
const stripMarkdown = (md: string): string =>
  md
    .replace(/^#{1,6}\s+/gm, '')       // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')   // bold
    .replace(/\*(.+?)\*/g, '$1')       // italic
    .replace(/^\s*[-*]\s+/gm, '• ')    // unordered lists
    .replace(/^\s*\d+\.\s+/gm, '')     // ordered list numbers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/\n{3,}/g, '\n\n')        // collapse blank lines
    .trim();

export const generateBylawsPDF = async (
  entries: BylawPdfEntry[],
  waqfInfo?: PdfWaqfInfo,
) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';
  const pageW = doc.internal.pageSize.width;
  const margin = 18;
  const contentW = pageW - margin * 2;

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  // Title
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text('اللائحة التنظيمية', pageW / 2, startY + 5, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(fontFamily, 'normal');
  doc.text('لائحة تنظيم أعمال الوقف والنظارة', pageW / 2, startY + 16, { align: 'center' });

  // Table of contents
  const tocRows = entries.map((e) => [
    e.chapter_title || e.part_title,
    e.part_number === 0 ? 'مقدمة' : `الجزء ${e.part_number}`,
  ]);

  autoTable(doc, {
    startY: startY + 24,
    head: [['العنوان', 'الجزء']],
    body: tocRows,
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GOLD, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  // Content pages
  for (const entry of entries) {
    doc.addPage();
    let y = 22;

    // Part badge
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(13);
    const badge = entry.part_number === 0 ? 'المقدمة' : `الجزء ${entry.part_number}: ${entry.part_title}`;
    doc.setFillColor(22, 101, 52);
    doc.setTextColor(255, 255, 255);
    const badgeW = doc.getTextWidth(badge) + 12;
    doc.roundedRect(pageW / 2 - badgeW / 2, y - 5, badgeW, 9, 2, 2, 'F');
    doc.text(badge, pageW / 2, y + 1, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += 12;

    // Chapter title if different
    if (entry.chapter_title && entry.chapter_title !== entry.part_title) {
      doc.setFont(fontFamily, 'bold');
      doc.setFontSize(12);
      doc.text(entry.chapter_title, pageW / 2, y, { align: 'center' });
      y += 10;
    }

    // Separator
    doc.setDrawColor(202, 138, 4);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    // Content body
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(10);
    const plainText = stripMarkdown(entry.content);
    const lines = doc.splitTextToSize(plainText, contentW);
    const pageH = doc.internal.pageSize.height;
    const bottomMargin = 24;

    for (const line of lines) {
      if (y + 6 > pageH - bottomMargin) {
        doc.addPage();
        y = 22;
      }
      doc.text(line, pageW - margin, y, { align: 'right' });
      y += 6;
    }
  }

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save('waqf-bylaws.pdf');
};
