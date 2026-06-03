// autoTable يُحمّل ديناميكياً داخل كل دالة لمنع تحميل vendor-pdf مبكراً
import {
  PdfWaqfInfo, createPdfDocument, finalizePdf,
  baseTableStyles, headStyles, TABLE_HEAD_GREEN, TABLE_HEAD_GOLD,
  reshapeArabic as rs, reshapeRow,
} from '../core/core';
import { getPdfThemeColors } from '../core/themeColors';
import { getLastAutoTableY } from '../core/pdfHelpers';
import {
  buildStatusColors,
  buildSeverityColors,
  type ForensicAuditData,
} from './forensicAuditTypes';
import { renderForensicSignature } from './forensicAuditSignature';

// Re-export public types for backward compatibility
export type {
  ForensicAuditCategory,
  ForensicSecurityFinding,
  ForensicAuditData,
} from './forensicAuditTypes';

export const generateForensicAuditPDF = async (data: ForensicAuditData, waqfInfo?: PdfWaqfInfo) => {
  const { default: autoTable } = await import('jspdf-autotable');
  const { doc, fontFamily: font, startY: headerY } = await createPdfDocument(waqfInfo, 'portrait');
  const themeColors = getPdfThemeColors();
  const STATUS_COLORS = buildStatusColors(themeColors);
  const SEVERITY_COLORS = buildSeverityColors(themeColors);
  const pageW = doc.internal.pageSize.width;
  const margin = 18;

  let y = headerY;

  // ─── Title ───
  doc.setFont(font, 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...themeColors.primary);
  doc.text(rs('تقرير الفحص الجنائي'), pageW / 2, y + 2, { align: 'center' });
  y += 8;
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(rs('Forensic Audit Report — نظام إدارة الوقف'), pageW / 2, y + 2, { align: 'center' });
  y += 10;

  // ─── Executive Summary ───
  doc.setDrawColor(...themeColors.primary);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  doc.setFont(font, 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...themeColors.primary);
  doc.text(rs('الملخص التنفيذي'), pageW - margin, y, { align: 'right' });
  y += 8;

  // Summary box
  doc.setFillColor(245, 250, 245);
  doc.roundedRect(margin, y - 2, pageW - 2 * margin, 32, 3, 3, 'F');

  doc.setFont(font, 'normal');
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);

  const summaryLines = [
    rs(`التقييم العام: ${data.overallScore}/100`),
    rs(`عدد الملفات المفحوصة: ${data.totalFiles} ملف`),
    rs(`الفحوصات الناجحة: ${data.checksPassed}  |  الفحوصات الفاشلة: ${data.checksFailed}`),
    rs(`تاريخ الفحص: ${data.auditDate}  |  المدقق: ${data.auditorName}`),
  ];
  summaryLines.forEach((line, i) => {
    doc.text(line, pageW - margin - 4, y + 5 + i * 7, { align: 'right' });
  });
  y += 38;

  // ─── Score visual ───
  const scoreX = pageW / 2;
  doc.setFillColor(...themeColors.primary);
  doc.circle(scoreX, y + 8, 10, 'F');
  doc.setFont(font, 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(`${data.overallScore}`, scoreX, y + 11, { align: 'center' });
  doc.setFontSize(7);
  doc.text('/100', scoreX, y + 15, { align: 'center' });
  y += 24;

  // ─── Categories Table ───
  doc.setFont(font, 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...themeColors.primary);
  doc.text(rs('نتائج الفحص حسب المجال'), pageW - margin, y, { align: 'right' });
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [reshapeRow(['التقييم', 'التفاصيل', 'الحالة', 'المجال'])],
    body: data.categories.map(c => reshapeRow([c.score, c.details, c.status, c.category])),
    ...baseTableStyles(font),
    ...headStyles(TABLE_HEAD_GREEN, font),
    margin: { left: margin, right: margin },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 2) {
        const val = hookData.cell.raw as string;
        const color = STATUS_COLORS[val];
        if (color) {
          hookData.cell.styles.textColor = color;
          hookData.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  y = getLastAutoTableY(doc, y + 40) + 10;

  // ─── Security Findings Table ───
  if (y > 220) {
    doc.addPage();
    y = 25;
  }

  doc.setFont(font, 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...themeColors.secondary);
  doc.text(rs('نتائج الفحص الأمني'), pageW - margin, y, { align: 'right' });
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [reshapeRow(['الملاحظات', 'الحالة', 'الخطورة', 'النتيجة'])],
    body: data.securityFindings.map(f => reshapeRow([f.notes, f.status, f.severity, f.finding])),
    ...baseTableStyles(font),
    ...headStyles(TABLE_HEAD_GOLD, font),
    margin: { left: margin, right: margin },
    didParseCell: (hookData) => {
      if (hookData.section === 'body') {
        if (hookData.column.index === 2) {
          const val = hookData.cell.raw as string;
          const color = SEVERITY_COLORS[val];
          if (color) {
            hookData.cell.styles.textColor = color;
            hookData.cell.styles.fontStyle = 'bold';
          }
        }
        if (hookData.column.index === 1) {
          const val = hookData.cell.raw as string;
          const color = STATUS_COLORS[val];
          if (color) {
            hookData.cell.styles.textColor = color;
            hookData.cell.styles.fontStyle = 'bold';
          }
        }
      }
    },
  });

  y = getLastAutoTableY(doc, y + 40) + 12;

  // ─── Digital Signature Section ───
  renderForensicSignature({ doc, font, y, pageW, margin, data });

  finalizePdf(doc, font, `تقرير-الفحص-الجنائي-${data.auditDate}.pdf`, waqfInfo);
};
