/**
 * Official waqf stamp drawn as vector shapes in the PDF (no image asset),
 * so it prints identically on phone and desktop viewers.
 * ختم وقفي: حلقتان، عقد خرز، نجمة ثمانية هادئة، اسم الوقف، صفة النظارة، والرقم والتاريخ.
 */
import type { jsPDF } from 'jspdf';
import { reshapeArabic as rs } from '@/utils/pdf/core/arabicReshaper';
import { DEFAULT_PDF_COLORS } from '@/utils/pdf/core/themeColors';

export interface WaqfStampOptions {
  cx: number;
  cy: number;
  radius?: number;
  fontFamily: string;
  waqfName?: string;
  serial?: string;
  dateText?: string;
}

// ألوان طباعة ثابتة لا تتبع الوضع الداكن (سياق طباعة — مسموح بالقيم الثابتة)
const INK = DEFAULT_PDF_COLORS.primary;
const BRONZE = DEFAULT_PDF_COLORS.secondary;
const STAR_TINT: [number, number, number] = [232, 220, 196];

const octagram = (doc: jsPDF, cx: number, cy: number, r: number) => {
  for (const offset of [0, Math.PI / 4]) {
    const pts = [0, 1, 2, 3].map(i => {
      const a = offset + (i * Math.PI) / 2;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
    });
    for (let i = 0; i < 4; i++) {
      const [x1, y1] = pts[i]!;
      const [x2, y2] = pts[(i + 1) % 4]!;
      doc.line(x1, y1, x2, y2);
    }
  }
};

export function drawWaqfStamp(doc: jsPDF, o: WaqfStampOptions): void {
  const r = o.radius ?? 19;
  const k = r / 19;
  doc.saveGraphicsState();

  // نجمة ثمانية خلفية بلون فاتح
  doc.setDrawColor(...STAR_TINT);
  doc.setLineWidth(0.35 * k);
  octagram(doc, o.cx, o.cy, r - 6.5 * k);

  // الحلقات
  doc.setDrawColor(...INK);
  doc.setLineWidth(1.1 * k);
  doc.circle(o.cx, o.cy, r, 'S');
  doc.setDrawColor(...BRONZE);
  doc.setLineWidth(0.35 * k);
  doc.circle(o.cx, o.cy, r - 1.5 * k, 'S');
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.3 * k);
  doc.circle(o.cx, o.cy, r - 5 * k, 'S');

  // عقد خرز بين الحلقتين
  doc.setFillColor(...BRONZE);
  const beads = 40;
  for (let i = 0; i < beads; i++) {
    const a = (i * 2 * Math.PI) / beads;
    doc.circle(o.cx + (r - 3.25 * k) * Math.cos(a), o.cy + (r - 3.25 * k) * Math.sin(a), 0.32 * k, 'F');
  }

  // النصوص
  doc.setTextColor(...INK);
  const name = (o.waqfName || 'وقف مرزوق بن علي الثبيتي').slice(0, 30);
  doc.setFont(o.fontFamily, 'bold');
  doc.setFontSize((name.length > 22 ? 5.4 : 6.2) * k);
  doc.text(rs(name), o.cx, o.cy - 6.2 * k, { align: 'center' });

  doc.setFontSize(9.5 * k);
  doc.text(rs('ختم النظارة'), o.cx, o.cy + 1.2 * k, { align: 'center' });

  doc.setDrawColor(...BRONZE);
  doc.setLineWidth(0.25 * k);
  doc.line(o.cx - 7 * k, o.cy + 2.9 * k, o.cx + 7 * k, o.cy + 2.9 * k);

  doc.setFont(o.fontFamily, 'normal');
  doc.setFontSize(5.6 * k);
  doc.text(rs('ناظر الوقف'), o.cx, o.cy + 6.2 * k, { align: 'center' });

  doc.setFontSize(4.8 * k);
  if (o.serial) doc.text(o.serial, o.cx, o.cy + 9.6 * k, { align: 'center' });
  if (o.dateText) doc.text(o.dateText, o.cx, o.cy + (o.serial ? 12.2 : 10.2) * k, { align: 'center' });

  doc.restoreGraphicsState();
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
}
