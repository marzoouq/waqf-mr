import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  loadArabicFont,
  addHeader,
  addHeaderToAllPages,
  addFooter,
  baseTableStyles,
  headStyles,
  TABLE_HEAD_GREEN,
  type PdfWaqfInfo,
  reshapeArabic as rs, reshapeRow,
} from './core';
import { getTableNameAr, getOperationNameAr, type AuditLogEntry } from '@/hooks/useAuditLog';


export interface AuditLogPdfOptions {
  logs: AuditLogEntry[];
  waqfInfo?: PdfWaqfInfo;
  tableFilter?: string;
  opFilter?: string;
}

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('ar-SA');
  } catch {
    return iso;
  }
};

const summarizeData = (data: Record<string, unknown> | null): string => {
  if (!data) return '—';
  const entries = Object.entries(data).filter(
    ([k]) => !['id', 'created_at', 'updated_at', 'national_id', 'bank_account'].includes(k),
  );
  if (entries.length === 0) return '—';
  return entries
    .slice(0, 4)
    .map(([k, v]) => {
      const val = v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v);
      const shortVal = val.length > 30 ? val.slice(0, 27) + '...' : val;
      return `${k}: ${shortVal}`;
    })
    .join(' | ');
};

const getSummary = (log: AuditLogEntry): string => {
  if (log.operation === 'REOPEN' && log.new_data) {
    const nd = log.new_data as Record<string, unknown>;
    const reason = nd.reason ? String(nd.reason) : '';
    return reason ? `السبب: ${reason}` : 'إعادة فتح';
  }
  if (log.operation === 'UPDATE' && log.old_data && log.new_data) {
    const od = log.old_data as Record<string, unknown>;
    const nd = log.new_data as Record<string, unknown>;
    const changed = Object.keys(nd).filter(
      k => !['id', 'created_at', 'updated_at'].includes(k) && JSON.stringify(od[k]) !== JSON.stringify(nd[k]),
    );
    if (changed.length === 0) return 'لا توجد تغييرات';
    return changed.slice(0, 3).map(k => k).join(', ');
  }
  if (log.operation === 'INSERT' && log.new_data) {
    return summarizeData(log.new_data as Record<string, unknown>);
  }
  if (log.operation === 'DELETE' && log.old_data) {
    return summarizeData(log.old_data as Record<string, unknown>);
  }
  return '—';
};

export const generateAuditLogPDF = async (options: AuditLogPdfOptions) => {
  const { logs, waqfInfo, tableFilter, opFilter } = options;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  // Title
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(14);
  doc.text(rs('تقرير سجل المراجعة والتدقيق'), doc.internal.pageSize.width / 2, startY + 2, { align: 'center' });

  // Filter description
  let filterDesc = '';
  if (tableFilter && tableFilter !== 'all') filterDesc += `الجدول: ${getTableNameAr(tableFilter)}`;
  if (opFilter && opFilter !== 'all') {
    if (filterDesc) filterDesc += '  |  ';
    filterDesc += `العملية: ${getOperationNameAr(opFilter)}`;
  }
  if (filterDesc) {
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(9);
    doc.text(rs(filterDesc), doc.internal.pageSize.width / 2, startY + 9, { align: 'center' });
  }

  // Stats line
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(9);
  const statsY = startY + (filterDesc ? 15 : 9);
  const inserts = logs.filter(l => l.operation === 'INSERT').length;
  const updates = logs.filter(l => l.operation === 'UPDATE').length;
  const deletes = logs.filter(l => l.operation === 'DELETE').length;
  const reopens = logs.filter(l => l.operation === 'REOPEN').length;
  const statsText = `إجمالي: ${logs.length}  |  إضافة: ${inserts}  |  تعديل: ${updates}  |  حذف: ${deletes}${reopens > 0 ? `  |  إعادة فتح: ${reopens}` : ''}`;
  doc.text(rs(statsText), doc.internal.pageSize.width / 2, statsY, { align: 'center' });

  // Table
  const tableData = logs.map(log => reshapeRow([
    formatDate(log.created_at),
    getTableNameAr(log.table_name),
    getOperationNameAr(log.operation),
    getSummary(log),
  ]));

  autoTable(doc, {
    startY: statsY + 5,
    head: [reshapeRow(['التاريخ والوقت', 'الجدول', 'العملية', 'التفاصيل'])],
    body: tableData,
    ...baseTableStyles(fontFamily),
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 35 },
      2: { cellWidth: 25 },
      3: { cellWidth: 'auto' },
    },
    margin: { top: 22, right: 18, bottom: 20, left: 18 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const op = logs[data.row.index]?.operation;
        if (op === 'DELETE') data.cell.styles.textColor = [180, 40, 40];
        else if (op === 'INSERT') data.cell.styles.textColor = [22, 101, 52];
        else if (op === 'REOPEN') data.cell.styles.textColor = [37, 99, 235];
        else if (op === 'UPDATE') data.cell.styles.textColor = [180, 120, 10];
      }
    },
  });

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);

  doc.save('تقرير-سجل-المراجعة.pdf');
};
