import type jsPDF from 'jspdf';
import { startSectionPage } from '@/utils/pdf/core/pdfLayout';
import { reshapeArabic } from '@/utils/pdf/core/arabicReshaper';

export function renderClosureDisclosure(doc: jsPDF, font: string, text?: string) {
  if (!text) return;
  const y = startSectionPage(doc, 35, 36, 'إفصاح الذمم عند الإقفال');
  doc.setFont(font, 'bold');
  doc.setFontSize(14);
  doc.text(reshapeArabic('إفصاح الذمم عند الإقفال — للعلم فقط'), 105, y, { align: 'center' });
  doc.setFont(font, 'normal');
  doc.setFontSize(11);
  doc.text(doc.splitTextToSize(reshapeArabic(text), 175), 190, y + 15, { align: 'right' });
}