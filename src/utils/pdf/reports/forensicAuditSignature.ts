/**
 * قسم التوقيع الرقمي والاعتماد لتقرير الفحص الجنائي
 */
import type { jsPDF } from 'jspdf';
import { reshapeArabic as rs } from '../core/core';
import { getPdfThemeColors } from '../core/themeColors';
import type { ForensicAuditData } from './forensicAuditTypes';

interface SignatureParams {
  doc: jsPDF;
  font: string;
  y: number;
  pageW: number;
  margin: number;
  data: ForensicAuditData;
}

export function renderForensicSignature({ doc, font, y, pageW, margin, data }: SignatureParams) {
  const themeColors = getPdfThemeColors();
  let currentY = y;
  if (currentY > 230) {
    doc.addPage();
    currentY = 25;
  }

  // Signature box
  const boxH = 42;
  doc.setDrawColor(...themeColors.primary);
  doc.setLineWidth(1);
  doc.roundedRect(margin, currentY, pageW - 2 * margin, boxH, 3, 3, 'S');

  // Inner dashed line
  doc.setDrawColor(...themeColors.secondary);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([2, 2], 0);
  doc.roundedRect(margin + 2, currentY + 2, pageW - 2 * margin - 4, boxH - 4, 2, 2, 'S');
  doc.setLineDashPattern([], 0);

  doc.setFont(font, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...themeColors.primary);
  doc.text(rs('التوقيع الرقمي والاعتماد'), pageW / 2, currentY + 8, { align: 'center' });

  doc.setFont(font, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(rs(`أُعد بواسطة: نظام إدارة الوقف — الفحص الجنائي الآلي`), pageW - margin - 6, currentY + 16, { align: 'right' });
  doc.text(rs(`اعتمده: ${data.auditorName}`), pageW - margin - 6, currentY + 23, { align: 'right' });
  doc.text(rs(`التاريخ: ${data.auditDate}`), pageW - margin - 6, currentY + 30, { align: 'right' });

  // Circular "مُعتمد" stamp
  const stampX = margin + 25;
  const stampY = currentY + 22;
  const stampR = 11;

  doc.setDrawColor(...themeColors.primary);
  doc.setLineWidth(1.5);
  doc.circle(stampX, stampY, stampR, 'S');
  doc.setLineWidth(0.5);
  doc.circle(stampX, stampY, stampR - 2, 'S');

  doc.setFont(font, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...themeColors.primary);
  doc.text(rs('مُعتمد'), stampX, stampY + 1, { align: 'center' });

  doc.setFontSize(5);
  doc.text('APPROVED', stampX, stampY + 5, { align: 'center' });
}
