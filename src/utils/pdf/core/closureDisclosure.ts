import type jsPDF from 'jspdf';
import { startSectionPage } from '@/utils/pdf/core/pdfLayout';
import { reshapeArabic } from '@/utils/pdf/core/arabicReshaper';

/** Renders the closure note; returns the Y where it ends (null when nothing was drawn). */
export function renderClosureDisclosure(doc: jsPDF, font: string, text?: string): number | null {
  if (!text) return null;
  const y = startSectionPage(doc, 35, 36, 'إفصاح الذمم عند الإقفال');
  doc.setFont(font, 'bold');
  doc.setFontSize(14);
  doc.text(reshapeArabic('إفصاح الذمم عند الإقفال — للعلم فقط'), 105, y, { align: 'center' });
  doc.setFont(font, 'normal');
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(reshapeArabic(text), 175) as string[];
  doc.text(lines, 190, y + 15, { align: 'right' });
  return y + 15 + lines.length * 5.5;
}
