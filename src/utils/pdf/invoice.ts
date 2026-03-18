/**
 * تصدير فواتير جدول `invoices` — client-side jsPDF
 * يعيد استخدام نفس قوالب paymentInvoice.ts لضمان تطابق المعاينة والتصدير
 */
import { supabase } from '@/integrations/supabase/client';
import { safeNumber } from '@/utils/safeNumber';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import {
  generatePaymentInvoicePDF,
  type PaymentInvoicePdfData,
  type InvoiceTemplate,
} from './paymentInvoice';
import type { PdfWaqfInfo } from './core';
import type { Invoice } from '@/hooks/useInvoices';

export interface GenerateInvoicePdfClientOptions {
  invoice: Invoice;
  waqfInfo?: PdfWaqfInfo;
  template?: 'professional' | 'simplified';
  contract?: {
    contract_number: string;
    tenant_name: string;
    tenant_tax_number?: string | null;
    tenant_street?: string | null;
    tenant_district?: string | null;
    tenant_city?: string | null;
    payment_count?: number;
  } | null;
  propertyNumber?: string;
}

/** تحويل اسم القالب من واجهة المعاينة إلى نظام القوالب الداخلي */
const mapTemplate = (t?: 'professional' | 'simplified'): InvoiceTemplate =>
  t === 'simplified' ? 'compact' : 'tax_professional';

/**
 * توليد PDF لفاتورة من جدول invoices — client-side
 * يستخدم نفس قوالب paymentInvoice.ts لتطابق المعاينة والتصدير
 */
export const generateInvoiceClientPDF = async (
  opts: GenerateInvoicePdfClientOptions,
): Promise<string | null> => {
  try {
    const { invoice, contract, propertyNumber, waqfInfo } = opts;
    const vatAmount = safeNumber(invoice.vat_amount);
    const amount = safeNumber(invoice.amount);
    const vatRate = safeNumber(invoice.vat_rate);
    const amountExVat = vatAmount > 0
      ? amount - vatAmount
      : (vatRate > 0 ? amount / (1 + vatRate / 100) : amount);

    const tenantAddress = [
      contract?.tenant_street,
      contract?.tenant_district,
      contract?.tenant_city,
    ].filter(Boolean).join('، ') || undefined;

    // تحويل بيانات Invoice → PaymentInvoicePdfData
    const pdfData: PaymentInvoicePdfData = {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number || `INV-${invoice.id.slice(0, 6)}`,
      contractNumber: contract?.contract_number || invoice.contract?.contract_number || '-',
      tenantName: contract?.tenant_name || invoice.contract?.tenant_name || '-',
      propertyNumber: propertyNumber || invoice.property?.property_number || '-',
      paymentNumber: 1,
      totalPayments: contract?.payment_count || 1,
      amount,
      dueDate: invoice.date,
      status: invoice.status,
      paidDate: invoice.status === 'paid' ? invoice.updated_at : null,
      vatRate,
      vatAmount,
      tenantVatNumber: contract?.tenant_tax_number || undefined,
      tenantAddress,
      notes: invoice.description || undefined,
      lineItems: [{
        description: invoice.description || 'خدمة',
        quantity: 1,
        unitPrice: Math.round(amountExVat * 100) / 100,
        vatRate,
      }],
    };

    const internalTemplate = mapTemplate(opts.template);

    // generatePaymentInvoicePDF ترفع إلى payment-invoices/ وتحدّث payment_invoices
    // تحديث payment_invoices لن يجد سجلاً (id مختلف) — لا ضرر
    const url = await generatePaymentInvoicePDF(pdfData, waqfInfo, internalTemplate);

    // تحديث file_path في جدول invoices الأصلي
    if (url) {
      const safeName = (invoice.invoice_number || invoice.id).replace(/[./\\]+/g, '_');
      const storagePath = `payment-invoices/${safeName}.pdf`;
      await supabase
        .from('invoices')
        .update({ file_path: storagePath })
        .eq('id', invoice.id);
    }

    toast.success('تم توليد ملف PDF بنجاح');
    return url;
  } catch (err) {
    logger.error('[generateInvoiceClientPDF] Error:', err);
    toast.error('حدث خطأ أثناء توليد ملف PDF');
    return null;
  }
};
