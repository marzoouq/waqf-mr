import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PdfWaqfInfo, loadArabicFont, addHeader, addHeaderToAllPages, addFooter,
  TABLE_HEAD_GREEN, TABLE_HEAD_RED,
  baseTableStyles, headStyles, footStyles,
} from './core';
import type { PaymentInvoice } from '@/hooks/usePaymentInvoices';

export const generateInvoicesViewPDF = async (invoices: Array<{
  invoice_type: string;
  invoice_number: string | null;
  amount: number;
  date: string;
  property_number: string;
  status: string;
}>, waqfInfo?: PdfWaqfInfo) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text('تقرير الفواتير', 105, startY + 5, { align: 'center' });

  const statusLabel = (s: string) => {
    switch (s) {
      case 'paid': return 'مدفوعة';
      case 'pending': return 'معلّقة';
      case 'cancelled': return 'ملغاة';
      case 'overdue': return 'متأخرة';
      default: return s;
    }
  };

  const total = invoices.reduce((sum, i) => sum + Number(i.amount), 0);

  autoTable(doc, {
    startY: startY + 14,
    head: [['#', 'النوع', 'رقم الفاتورة', 'المبلغ', 'التاريخ', 'العقار', 'الحالة']],
    body: invoices.map((item, i) => [
      i + 1,
      item.invoice_type,
      item.invoice_number || '-',
      `${Number(item.amount).toLocaleString()} ر.س`,
      item.date,
      item.property_number || '-',
      statusLabel(item.status),
    ]),
    foot: [['', 'الإجمالي', '', `${total.toLocaleString()} ر.س`, '', '', '']],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...footStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save('invoices-report.pdf');
};
