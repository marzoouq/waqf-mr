/**
 * Vector official waqf stamp drawn directly in the PDF (no image asset needed).
 */
import type { jsPDF } from 'jspdf';
import { reshapeArabic as rs } from '@/utils/pdf/core/arabicReshaper';

export interface WaqfStampOptions {
  cx: number;
  cy: number;
  radius?: number;
  fontFamily: string;
  waqfName?: string;
  serial: string;
  dateText: string;
}

// لون الختم الرسمي (سياق طباعة — مسموح بالقيم الثابتة)
const STAMP_RGB: [number, number, number] = [22, 78, 130];

export function drawWaqfStamp(doc: jsPDF, o: WaqfStampOptions): void {
  const r = o.radius ?? 18;
  doc.saveGraphicsState();
  doc.setDrawColor(...STAMP_RGB);
  doc.setTextColor(...STAMP_RGB);

  // حلقتان خارجيتان ودائرة داخلية منقطة
  doc.setLineWidth(0.9);
  doc.circle(o.cx, o.cy, r, 'S');
  doc.setLineWidth(0.35);
  doc.circle(o.cx, o.cy, r - 1.6, 'S');
  doc.setLineDashPattern([0.6, 0.6], 0);
  doc.circle(o.cx, o.cy, r - 7, 'S');
  doc.setLineDashPattern([], 0);

  // نجوم زخرفية على الجانبين
  doc.setFontSize(7);
  doc.text('*', o.cx - r + 3.6, o.cy + 1, { align: 'center' });
  doc.text('*', o.cx + r - 3.6, o.cy + 1, { align: 'center' });

  // اسم الوقف في الحلقة العلوية
  doc.setFont(o.fontFamily, 'bold');
  const name = (o.waqfName || 'وقف مرزوق بن علي الثبيتي').slice(0, 30);
  doc.setFontSize(name.length > 22 ? 5.6 : 6.4);
  doc.text(rs(name), o.cx, o.cy - r + 5.2, { align: 'center' });

  // الوسط
  doc.setFontSize(9);
  doc.text(rs('ختم الوقف'), o.cx, o.cy - 0.6, { align: 'center' });
  doc.setFont(o.fontFamily, 'normal');
  doc.setFontSize(5.6);
  doc.text(rs('ناظر الوقف'), o.cx, o.cy + 3.6, { align: 'center' });

  // الرقم والتاريخ في الحلقة السفلية
  doc.setFontSize(5);
  doc.text(o.serial, o.cx, o.cy + r - 6.4, { align: 'center' });
  doc.text(o.dateText, o.cx, o.cy + r - 3.4, { align: 'center' });

  doc.restoreGraphicsState();
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
}
