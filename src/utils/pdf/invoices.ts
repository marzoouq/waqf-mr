import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PdfWaqfInfo, loadArabicFont, addHeader, addHeaderToAllPages, addFooter,
  TABLE_HEAD_GREEN, TABLE_HEAD_RED,
  baseTableStyles, headStyles, footStyles,
  reshapeArabic as rs, reshapeRow,
} from './core';
import type { PaymentInvoice } from '@/hooks/usePaymentInvoices';
import { safeNumber } from '@/utils/safeNumber';
import { fmt } from '@/utils/format';
import { toast } from 'sonner';

export const generateInvoicesViewPDF = async (invoices: Array<{
  invoice_type: string;
  invoice_number: string | null;
  amount: number;
  date: string;
  property_number: string;
  status: string;
}>, waqfInfo?: PdfWaqfInfo, fiscalYearLabel?: string) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  const titleText = fiscalYearLabel ? `تقرير الفواتير — ${fiscalYearLabel}` : 'تقرير الفواتير';
  doc.text(rs(titleText), 105, startY + 5, { align: 'center' });

  const statusLabel = (s: string) => {
    switch (s) {
      case 'paid': return 'مدفوعة';
      case 'pending': return 'معلّقة';
      case 'cancelled': return 'ملغاة';
      case 'overdue': return 'متأخرة';
      default: return s;
    }
  };

  const total = invoices.reduce((sum, i) => sum + safeNumber(i.amount), 0);

  autoTable(doc, {
    startY: startY + 14,
    head: [reshapeRow(['#', 'النوع', 'رقم الفاتورة', 'المبلغ', 'التاريخ', 'العقار', 'الحالة'])],
    body: invoices.map((item, i) => reshapeRow([
      i + 1,
      item.invoice_type,
      item.invoice_number || '-',
      `${fmt(safeNumber(item.amount))} ر.س`,
      item.date,
      item.property_number || '-',
      statusLabel(item.status),
    ])),
    foot: [reshapeRow(['', 'الإجمالي', '', `${fmt(total)} ر.س`, '', '', ''])],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...footStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save('invoices-report.pdf');
};

/**
 * تصدير تقرير PDF بالفواتير المتأخرة فقط
 */
export const generateOverdueInvoicesPDF = async (
  invoices: PaymentInvoice[],
  waqfInfo?: PdfWaqfInfo,
) => {
  const overdue = invoices.filter(i => i.status === 'overdue');
  if (overdue.length === 0) {
    toast.info('لا توجد فواتير متأخرة للتصدير');
    return;
  }

  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text(rs('تقرير الفواتير المتأخرة'), 105, startY + 5, { align: 'center' });

  const totalAmount = overdue.reduce((s, i) => s + safeNumber(i.amount), 0);
  const today = new Date();

  // ملخص
  doc.setFontSize(11);
  doc.setFont(fontFamily, 'normal');
  doc.text(rs(`عدد الفواتير المتأخرة: ${overdue.length}`), 195, startY + 16, { align: 'right' });
  doc.text(rs(`إجمالي المبالغ المتأخرة: ${fmt(totalAmount)} ر.س`), 195, startY + 23, { align: 'right' });

  const calcDaysLate = (dueDate: string) => {
    const due = new Date(dueDate);
    const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  autoTable(doc, {
    startY: startY + 30,
    head: [reshapeRow(['#', 'رقم الفاتورة', 'المستأجر', 'رقم العقد', 'العقار', 'تاريخ الاستحقاق', 'المبلغ', 'أيام التأخر'])],
    body: overdue.map((inv, i) => reshapeRow([
      i + 1,
      inv.invoice_number || '-',
      inv.contract?.tenant_name ?? '-',
      inv.contract?.contract_number ?? '-',
      inv.contract?.property?.property_number ?? '-',
      inv.due_date || '-',
      `${fmt(safeNumber(inv.amount))} ر.س`,
      inv.due_date ? calcDaysLate(inv.due_date) : 0,
    ])),
    foot: [reshapeRow(['', 'الإجمالي', '', '', '', '', `${fmt(totalAmount)} ر.س`, ''])],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_RED, fontFamily),
    ...footStyles(TABLE_HEAD_RED, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save('overdue-invoices-report.pdf');
};
