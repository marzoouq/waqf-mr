import type { SummaryPdfData } from '@/types/summaryPdf';
import { createPdfDocument, finalizePdf, reshapeArabic, reshapeRow, baseTableStyles, headStyles, TABLE_HEAD_GREEN, type PdfWaqfInfo } from '@/utils/pdf/core/core';

/** Export exactly the prepared visible report, through the official document path. */
export async function generateSummaryPdf(data: SummaryPdfData, waqfInfo?: PdfWaqfInfo) {
  const { default: autoTable } = await import('jspdf-autotable');
  const { doc, fontFamily, startY } = await createPdfDocument(waqfInfo);
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(16);
  doc.text(reshapeArabic(data.title), 105, startY + 5, { align: 'center' });
  if (data.subtitle) {
    doc.setFontSize(10);
    doc.text(reshapeArabic(data.subtitle), 105, startY + 13, { align: 'center' });
  }
  autoTable(doc, {
    startY: startY + 22, body: data.rows.map(reshapeRow),
    ...baseTableStyles(fontFamily), ...headStyles(TABLE_HEAD_GREEN, fontFamily),
  });
  return finalizePdf(doc, fontFamily, data.filename, waqfInfo);
}