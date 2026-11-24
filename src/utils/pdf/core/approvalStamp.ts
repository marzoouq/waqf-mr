/**
 * Approval block placed after the document content: overseer signature line + waqf stamp.
 * ينتقل لصفحة جديدة إن لم تتسع المساحة، فلا يتداخل الختم مع الجداول أو التذييل.
 */
import type jsPDF from 'jspdf';
import { reshapeArabic as rs } from './arabicReshaper';
import { drawWaqfStamp } from './waqfStamp';
import { riyadhToday } from './pdfLayout';
import { DEFAULT_PDF_COLORS } from './themeColors';
import type { PdfWaqfInfo } from './core';

const BLOCK_H = 48;
const FOOTER_RESERVE = 26;
const MARGIN = 20;

export const addApprovalStamp = (
  doc: jsPDF, fontFamily: string, waqfInfo: PdfWaqfInfo | undefined, contentEndY: number,
  opts?: { serial?: string; title?: string },
): number => {
  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;
  let y = contentEndY + 8;
  if (y + BLOCK_H > pageH - FOOTER_RESERVE) {
    doc.addPage();
    y = 30;
  }
  const right = pageW - MARGIN;

  doc.setDrawColor(...DEFAULT_PDF_COLORS.secondary);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, right, y);

  doc.setTextColor(...DEFAULT_PDF_COLORS.primary);
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(11);
  doc.text(rs(opts?.title ?? 'اعتماد ناظر الوقف'), right, y + 9, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(10);
  if (waqfInfo?.adminName) doc.text(rs(waqfInfo.adminName), right, y + 17, { align: 'right' });
  doc.setFontSize(9);
  doc.text(rs('التوقيع'), right, y + 30, { align: 'right' });
  doc.setLineDashPattern([1, 1], 0);
  doc.line(right - 70, y + 31, right - doc.getTextWidth(rs('التوقيع')) - 3, y + 31);
  doc.setLineDashPattern([], 0);

  drawWaqfStamp(doc, {
    cx: MARGIN + 24, cy: y + 23, radius: 19, fontFamily,
    waqfName: waqfInfo?.waqfName, serial: opts?.serial, dateText: riyadhToday(new Date()),
  });
  return y + BLOCK_H;
};

/** Stamp right after the last table (or after a given end Y on the current page). */
export const stampAfterContent = (
  doc: jsPDF, fontFamily: string, waqfInfo: PdfWaqfInfo | undefined, endY?: number | null,
): number => {
  const last = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
  return addApprovalStamp(doc, fontFamily, waqfInfo, endY ?? last ?? 40);
};
