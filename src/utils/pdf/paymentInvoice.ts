import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PdfWaqfInfo, loadArabicFont, addHeader, addFooter,
  TABLE_HEAD_GREEN,
  baseTableStyles, headStyles,
} from './core';
import { getLastAutoTableY } from './pdfHelpers';
import { supabase } from '@/integrations/supabase/client';
import { generateZatcaQrTLV } from '@/utils/zatcaQr';

export interface PaymentInvoicePdfData {
  id: string;
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
  vatRate?: number;
  vatAmount?: number;
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
): Promise<string | null> => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  // عنوان الفاتورة
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);

  const vatRate = invoice.vatRate ?? 0;
  const vatAmount = invoice.vatAmount ?? 0;
  const isVatApplicable = vatRate > 0;

  const title = isVatApplicable ? 'فاتورة ضريبية مبسّطة' : 'فاتورة دفعة مستحقة';
  doc.text(title, 105, startY + 5, { align: 'center' });

  // جدول بيانات الفاتورة (label / value)
  const rows: string[][] = [
    ['رقم الفاتورة', invoice.invoiceNumber],
    ['رقم العقد', invoice.contractNumber],
    ['المستأجر', invoice.tenantName],
    ['العقار', invoice.propertyNumber],
    ['رقم الدفعة', `${invoice.paymentNumber} من ${invoice.totalPayments}`],
  ];

  // VAT conditional rows
  if (isVatApplicable) {
    const amountExVat = invoice.amount - vatAmount;
    rows.push(['المبلغ قبل الضريبة', `${Number(amountExVat).toLocaleString()} ر.س`]);
    rows.push([`ضريبة القيمة المضافة (${vatRate}%)`, `${Number(vatAmount).toLocaleString()} ر.س`]);
    rows.push(['الإجمالي شاملاً الضريبة', `${Number(invoice.amount).toLocaleString()} ر.س`]);
  } else {
    rows.push(['المبلغ', `${Number(invoice.amount).toLocaleString()} ر.س`]);
  }

  rows.push(['تاريخ الاستحقاق', invoice.dueDate]);
  rows.push(['الحالة', statusLabel(invoice.status)]);

  if (!isVatApplicable) {
    rows.push(['ضريبة القيمة المضافة', 'معفاة من ضريبة القيمة المضافة']);
  }

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

  const finalY = getLastAutoTableY(doc, startY + 120);

  // QR Code TLV for VAT invoices
  if (isVatApplicable && waqfInfo?.vatNumber) {
    const tlvBase64 = generateZatcaQrTLV({
      sellerName: waqfInfo.waqfName || '',
      vatNumber: waqfInfo.vatNumber,
      timestamp: new Date().toISOString(),
      totalWithVat: invoice.amount,
      vatAmount: vatAmount,
    });

    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(`TLV: ${tlvBase64.substring(0, 60)}...`, 105, finalY + 8, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  // ملاحظة أسفل الجدول
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('هذه الفاتورة صادرة إلكترونياً من نظام إدارة الوقف', 105, finalY + 16, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  addFooter(doc, fontFamily, waqfInfo);

  // Upload to Storage instead of local save
  try {
    const pdfBlob = doc.output('blob');
    const storagePath = `payment-invoices/${invoice.invoiceNumber}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(storagePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: false,
      });

    // If file already exists (upsert: false), try with timestamp suffix
    if (uploadError?.message?.includes('already exists') || uploadError?.message?.includes('Duplicate')) {
      const timestampPath = `payment-invoices/${invoice.invoiceNumber}-${Date.now()}.pdf`;
      await supabase.storage
        .from('invoices')
        .upload(timestampPath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false,
        });

      // Update file_path in DB
      await supabase
        .from('payment_invoices')
        .update({ file_path: timestampPath })
        .eq('id', invoice.id);
    } else if (!uploadError) {
      // Update file_path in DB
      await supabase
        .from('payment_invoices')
        .update({ file_path: storagePath })
        .eq('id', invoice.id);
    }

    // Return blob URL for immediate viewing
    return URL.createObjectURL(pdfBlob);
  } catch {
    // Fallback: save locally if storage upload fails
    doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
    return null;
  }
};
