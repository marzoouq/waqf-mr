import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PdfWaqfInfo, loadArabicFont, addHeader, addFooter,
  TABLE_HEAD_GREEN,
  baseTableStyles, headStyles,
} from './core';
import { getLastAutoTableY } from './pdfHelpers';

export interface PaymentInvoicePdfData {
  invoiceNumber: string;
  contractNumber: string;
  tenantName: string;
  propertyNumber: string;
  paymentNumber: number;
  totalPayments: number;
  amount: number;
  dueDate: string;
  status: string;
  paidDate?: string | null;
  paidAmount?: number | null;
  notes?: string | null;
}

const statusLabel = (s: string) => {
  switch (s) {
    case 'paid': return 'مسددة';
    case 'pending': return 'قيد الانتظار';
    case 'overdue': return 'متأخرة';
    case 'partially_paid': return 'مسددة جزئياً';
    default: return s;
  }
};

export const generatePaymentInvoicePDF = async (
  invoice: PaymentInvoicePdfData,
  waqfInfo?: PdfWaqfInfo,
) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  // عنوان الفاتورة
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text('فاتورة دفعة مستحقة', 105, startY + 5, { align: 'center' });

  // جدول بيانات الفاتورة (label / value)
  const rows: string[][] = [
    ['رقم الفاتورة', invoice.invoiceNumber],
    ['رقم العقد', invoice.contractNumber],
    ['المستأجر', invoice.tenantName],
    ['العقار', invoice.propertyNumber],
    ['رقم الدفعة', `${invoice.paymentNumber} من ${invoice.totalPayments}`],
    ['المبلغ', `${Number(invoice.amount).toLocaleString()} ر.س`],
    ['تاريخ الاستحقاق', invoice.dueDate],
    ['الحالة', statusLabel(invoice.status)],
  ];

  if (invoice.paidDate) {
    rows.push(['تاريخ السداد', invoice.paidDate]);
  }
  if (invoice.paidAmount && invoice.paidAmount > 0) {
    rows.push(['المبلغ المسدد', `${Number(invoice.paidAmount).toLocaleString()} ر.س`]);
  }
  if (invoice.notes) {
    rows.push(['ملاحظات', invoice.notes]);
  }

  autoTable(doc, {
    startY: startY + 14,
    head: [['البيان', 'التفاصيل']],
    body: rows,
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
    },
  });

  // ملاحظة أسفل الجدول
  const finalY = getLastAutoTableY(doc, startY + 120);
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('هذه الفاتورة صادرة إلكترونياً من نظام إدارة الوقف', 105, finalY + 10, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  addFooter(doc, fontFamily, waqfInfo);
  doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
};
