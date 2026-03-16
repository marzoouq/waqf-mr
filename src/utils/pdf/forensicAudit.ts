import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PdfWaqfInfo, loadArabicFont, addHeader, addFooter, addHeaderToAllPages,
  baseTableStyles, headStyles, TABLE_HEAD_GREEN, TABLE_HEAD_GOLD,
} from './core';
import { getLastAutoTableY } from './pdfHelpers';

export interface ForensicAuditCategory {
  category: string;
  status: 'سليم' | 'مُصحح' | 'ملاحظة';
  details: string;
  score: string;
}

export interface ForensicSecurityFinding {
  finding: string;
  severity: 'خطأ' | 'تحذير' | 'معلومة';
  status: 'مُعالج' | 'مُتجاهل' | 'معلق';
  notes: string;
}

export interface ForensicAuditData {
  auditDate: string;
  auditorName: string;
  overallScore: number;
  totalFiles: number;
  issuesFound: number;
  issuesFixed: number;
  categories: ForensicAuditCategory[];
  securityFindings: ForensicSecurityFinding[];
}

const STATUS_COLORS: Record<string, [number, number, number]> = {
  'سليم': [22, 101, 52],
  'مُصحح': [202, 138, 4],
  'ملاحظة': [180, 40, 40],
  'مُعالج': [22, 101, 52],
  'مُتجاهل': [100, 100, 100],
  'معلق': [180, 40, 40],
};

const SEVERITY_COLORS: Record<string, [number, number, number]> = {
  'خطأ': [180, 40, 40],
  'تحذير': [202, 138, 4],
  'معلومة': [59, 130, 246],
};

export const generateForensicAuditPDF = async (data: ForensicAuditData, waqfInfo?: PdfWaqfInfo) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const fontLoaded = await loadArabicFont(doc);
  const font = fontLoaded ? 'Amiri' : 'helvetica';
  const pageW = doc.internal.pageSize.width;
  const margin = 18;

  let y = await addHeader(doc, font, waqfInfo);

  // ─── Title ───
  doc.setFont(font, 'bold');
  doc.setFontSize(18);
  doc.setTextColor(22, 101, 52);
  doc.text('تقرير الفحص الجنائي', pageW / 2, y + 2, { align: 'center' });
  y += 8;
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text('Forensic Audit Report — نظام إدارة الوقف', pageW / 2, y + 2, { align: 'center' });
  y += 10;

  // ─── Executive Summary ───
  doc.setDrawColor(22, 101, 52);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  doc.setFont(font, 'bold');
  doc.setFontSize(13);
  doc.setTextColor(22, 101, 52);
  doc.text('الملخص التنفيذي', pageW - margin, y, { align: 'right' });
  y += 8;

  // Summary box
  doc.setFillColor(245, 250, 245);
  doc.roundedRect(margin, y - 2, pageW - 2 * margin, 32, 3, 3, 'F');

  doc.setFont(font, 'normal');
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);

  const summaryLines = [
    `التقييم العام: ${data.overallScore}/10`,
    `عدد الملفات المفحوصة: ${data.totalFiles} ملف`,
    `المشاكل المكتشفة: ${data.issuesFound}  |  المشاكل المصححة: ${data.issuesFixed}`,
    `تاريخ الفحص: ${data.auditDate}  |  المدقق: ${data.auditorName}`,
  ];
  summaryLines.forEach((line, i) => {
    doc.text(line, pageW - margin - 4, y + 5 + i * 7, { align: 'right' });
  });
  y += 38;

  // ─── Score visual ───
  const scoreX = pageW / 2;
  doc.setFillColor(22, 101, 52);
  doc.circle(scoreX, y + 8, 10, 'F');
  doc.setFont(font, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(`${data.overallScore}`, scoreX, y + 11, { align: 'center' });
  doc.setFontSize(7);
  doc.text('/10', scoreX, y + 15, { align: 'center' });
  y += 24;

  // ─── Categories Table ───
  doc.setFont(font, 'bold');
  doc.setFontSize(13);
  doc.setTextColor(22, 101, 52);
  doc.text('نتائج الفحص حسب المجال', pageW - margin, y, { align: 'right' });
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['التقييم', 'التفاصيل', 'الحالة', 'المجال']],
    body: data.categories.map(c => [c.score, c.details, c.status, c.category]),
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
  doc.setTextColor(202, 138, 4);
  doc.text('نتائج الفحص الأمني', pageW - margin, y, { align: 'right' });
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['الملاحظات', 'الحالة', 'الخطورة', 'النتيجة']],
    body: data.securityFindings.map(f => [f.notes, f.status, f.severity, f.finding]),
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
  if (y > 230) {
    doc.addPage();
    y = 25;
  }

  // Signature box
  const boxH = 42;
  doc.setDrawColor(22, 101, 52);
  doc.setLineWidth(1);
  doc.roundedRect(margin, y, pageW - 2 * margin, boxH, 3, 3, 'S');

  // Inner dashed line
  doc.setDrawColor(202, 138, 4);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([2, 2], 0);
  doc.roundedRect(margin + 2, y + 2, pageW - 2 * margin - 4, boxH - 4, 2, 2, 'S');
  doc.setLineDashPattern([], 0);

  doc.setFont(font, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(22, 101, 52);
  doc.text('التوقيع الرقمي والاعتماد', pageW / 2, y + 8, { align: 'center' });

  doc.setFont(font, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(`أُعد بواسطة: نظام إدارة الوقف — الفحص الجنائي الآلي`, pageW - margin - 6, y + 16, { align: 'right' });
  doc.text(`اعتمده: ${data.auditorName}`, pageW - margin - 6, y + 23, { align: 'right' });
  doc.text(`التاريخ: ${data.auditDate}`, pageW - margin - 6, y + 30, { align: 'right' });

  // Circular "مُعتمد" stamp
  const stampX = margin + 25;
  const stampY = y + 22;
  const stampR = 11;

  doc.setDrawColor(22, 101, 52);
  doc.setLineWidth(1.5);
  doc.circle(stampX, stampY, stampR, 'S');
  doc.setLineWidth(0.5);
  doc.circle(stampX, stampY, stampR - 2, 'S');

  doc.setFont(font, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(22, 101, 52);
  doc.text('مُعتمد', stampX, stampY + 1, { align: 'center' });

  doc.setFontSize(5);
  doc.text('APPROVED', stampX, stampY + 5, { align: 'center' });

  // Add headers and footers to all pages
  addHeaderToAllPages(doc, font, waqfInfo);
  addFooter(doc, font, waqfInfo);

  doc.save(`تقرير-الفحص-الجنائي-${data.auditDate}.pdf`);
};
