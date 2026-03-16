/**
 * مولّد PDF للتقرير السنوي للإنجازات
 */
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { loadArabicFont, addHeader, addFooter, type PdfWaqfInfo } from './core';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface AnnualReportPdfData {
  fiscalYearLabel: string;
  achievements: { title: string; content: string }[];
  challenges: { title: string; content: string }[];
  futurePlans: { title: string; content: string }[];
  propertyStatuses: { title: string; content: string; propertyName?: string }[];
  summaryCards?: { label: string; value: string }[];
}

export const generateAnnualReportPDF = async (
  data: AnnualReportPdfData,
  waqfInfo?: PdfWaqfInfo,
) => {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const fontLoaded = await loadArabicFont(doc);
    const fontFamily = fontLoaded ? 'Amiri' : 'helvetica';
    const pageW = doc.internal.pageSize.width;
    const margin = 18;

    let y = await addHeader(doc, fontFamily, waqfInfo);

    // عنوان التقرير
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(18);
    doc.text(`التقرير السنوي — ${data.fiscalYearLabel}`, pageW / 2, y + 4, { align: 'center' });
    y += 16;

    // بطاقات ملخصة
    if (data.summaryCards?.length) {
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(10);
      const cardW = (pageW - margin * 2 - 15) / 4;
      data.summaryCards.slice(0, 4).forEach((card, i) => {
        const cx = pageW - margin - (i * (cardW + 5)) - cardW;
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(cx, y, cardW, 16, 2, 2, 'F');
        doc.setFont(fontFamily, 'bold');
        doc.setFontSize(11);
        doc.text(card.value, cx + cardW / 2, y + 7, { align: 'center' });
        doc.setFont(fontFamily, 'normal');
        doc.setFontSize(7);
        doc.text(card.label, cx + cardW / 2, y + 13, { align: 'center' });
      });
      y += 22;
    }

    // دالة مساعدة لكتابة قسم
    const writeSection = (title: string, items: { title: string; content: string; propertyName?: string }[], color: [number, number, number]) => {
      if (items.length === 0) return;
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFont(fontFamily, 'bold');
      doc.setFontSize(14);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(title, pageW - margin, y, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      y += 8;

      items.forEach((item, idx) => {
        if (y > 265) { doc.addPage(); y = 20; }
        doc.setFont(fontFamily, 'bold');
        doc.setFontSize(11);
        const prefix = item.propertyName ? `${item.propertyName}: ` : '';
        doc.text(`${idx + 1}. ${prefix}${item.title}`, pageW - margin, y, { align: 'right' });
        y += 6;
        if (item.content) {
          doc.setFont(fontFamily, 'normal');
          doc.setFontSize(10);
          const lines = doc.splitTextToSize(item.content, pageW - margin * 2);
          lines.forEach((line: string) => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(line, pageW - margin, y, { align: 'right' });
            y += 5;
          });
        }
        y += 3;
      });
      y += 5;
    };

    // الأقسام
    writeSection('حالة العقارات', data.propertyStatuses, [71, 85, 105]);
    writeSection('الإنجازات', data.achievements, [22, 101, 52]);
    writeSection('التحديات', data.challenges, [180, 120, 20]);
    writeSection('الخطط المستقبلية', data.futurePlans, [37, 99, 235]);

    addFooter(doc, fontFamily, waqfInfo);
    doc.save(`التقرير_السنوي_${data.fiscalYearLabel}.pdf`);
    toast.success('تم تصدير التقرير السنوي بنجاح');
  } catch (e) {
    logger.error('خطأ في تصدير التقرير السنوي:', e);
    toast.error('فشل في تصدير التقرير');
  }
};
