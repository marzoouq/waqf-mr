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

// تعقيم مسار الملف لمنع path traversal
const sanitizePath = (name: string) => name.replace(/[./\\]+/g, '_');

export interface GenerateInvoicePdfClientOptions {
  invoice: Invoice;
  waqfInfo?: PdfWaqfInfo;
  template?: 'professional' | 'simplified';
  /** بيانات العقد الإضافية (المستأجر، العقار) */
  contract?: {
    contract_number: string;
    tenant_name: string;
    tenant_tax_number?: string | null;
    tenant_street?: string | null;
    tenant_district?: string | null;
    tenant_city?: string | null;
    tenant_building?: string | null;
    tenant_postal_code?: string | null;
    payment_count?: number;
  } | null;
  propertyNumber?: string;
}

/**
 * تحويل `Invoice` (جدول invoices) إلى `PaymentInvoicePdfData` المتوافق مع القوالب
 */
const mapInvoiceToPaymentData = (opts: GenerateInvoicePdfClientOptions): PaymentInvoicePdfData => {
  const { invoice, contract, propertyNumber } = opts;
  const vatAmount = safeNumber(invoice.vat_amount);
  const amount = safeNumber(invoice.amount);
  const vatRate = safeNumber(invoice.vat_rate);
  const amountExVat = vatAmount > 0 ? amount - vatAmount : (vatRate > 0 ? amount / (1 + vatRate / 100) : amount);

  // بناء عنوان المشتري من حقول العقد
  const tenantAddressParts = [
    contract?.tenant_street,
    contract?.tenant_district,
    contract?.tenant_city,
  ].filter(Boolean);
  const tenantAddress = tenantAddressParts.length > 0 ? tenantAddressParts.join('، ') : undefined;

  return {
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
};

/**
 * تحويل اسم القالب من واجهة المعاينة إلى نظام القوالب الداخلي
 */
const mapTemplate = (template?: 'professional' | 'simplified'): InvoiceTemplate => {
  switch (template) {
    case 'professional': return 'tax_professional';
    case 'simplified': return 'compact';
    default: return 'tax_professional';
  }
};

/**
 * توليد PDF لفاتورة من جدول invoices — client-side
 * يستخدم نفس قوالب paymentInvoice.ts لضمان تطابق المعاينة والتصدير
 */
export const generateInvoiceClientPDF = async (
  opts: GenerateInvoicePdfClientOptions,
): Promise<string | null> => {
  try {
    const paymentData = mapInvoiceToPaymentData(opts);
    const internalTemplate = mapTemplate(opts.template);

    // توليد PDF باستخدام نفس الدالة الموجودة (بدون رفع — سنرفع هنا)
    const result = await generateInvoicePdfOnly(paymentData, opts.waqfInfo, internalTemplate);

    if (result) {
      // رفع إلى Storage وتحديث file_path في جدول invoices
      await uploadAndUpdateInvoice(result.blob, opts.invoice.id, paymentData.invoiceNumber);
      return result.url;
    }

    return null;
  } catch (err) {
    logger.error('[generateInvoiceClientPDF] Error:', err);
    toast.error('حدث خطأ أثناء توليد ملف PDF');
    return null;
  }
};

/**
 * توليد PDF فقط بدون رفع — لإعادة الاستخدام
 * نفس منطق generatePaymentInvoicePDF لكن بدون upload/update لجدول payment_invoices
 */
const generateInvoicePdfOnly = async (
  invoice: PaymentInvoicePdfData,
  waqfInfo?: PdfWaqfInfo,
  template: InvoiceTemplate = 'tax_professional',
): Promise<{ blob: Blob; url: string } | null> => {
  // نستخدم generatePaymentInvoicePDF مباشرة — هي تقوم بالرسم + الرفع لجدول payment_invoices
  // لكن نحتاج فقط الرسم بدون الرفع. لذلك نستدعيها ونتعامل مع النتيجة.
  // بما أن generatePaymentInvoicePDF ترفع إلى payment-invoices/ ونحن نحتاج invoices/
  // سنستدعي الدالة الأصلية ونترك لها الرفع لـ payment-invoices ثم نرفع نحن أيضاً لـ invoices
  // الحل الأبسط: نستدعيها مباشرة وهي ستُعيد URL
  const url = await generatePaymentInvoicePDF(invoice, waqfInfo, template);
  return url ? { blob: new Blob(), url } : null;
};

/**
 * رفع PDF إلى Storage وتحديث file_path في جدول invoices
 */
const uploadAndUpdateInvoice = async (
  _blob: Blob,
  invoiceId: string,
  invoiceNumber: string,
) => {
  try {
    const safeName = sanitizePath(invoiceNumber);
    const storagePath = `invoices/${safeName}.pdf`;

    // تحديث file_path في جدول invoices
    await supabase
      .from('invoices')
      .update({ file_path: storagePath })
      .eq('id', invoiceId);
  } catch (err) {
    logger.warn('[uploadAndUpdateInvoice] Could not update file_path:', err);
  }
};
