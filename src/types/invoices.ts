/**
 * أنواع الفواتير المشتركة بين الطبقات
 *
 * #37 من تقرير الفحص: هذه الأنواع مفصولة عمداً عن `Tables<'invoices'>` المولّدة
 * لأنها تحوي joins (property, contract) وحقولاً محسوبة على مستوى التطبيق.
 * عدم استبدالها بـ Database type مقصود — حافظ على الفصل.
 */

export interface Invoice {
  id: string;
  invoice_number: string | null;
  invoice_type: string;
  amount: number;
  date: string;
  property_id: string | null;
  contract_id: string | null;
  expense_id: string | null;
  description: string | null;
  file_path: string | null;
  file_name: string | null;
  status: string;
  fiscal_year_id: string | null;
  vat_rate: number;
  vat_amount: number;
  amount_excluding_vat: number | null;
  zatca_uuid: string | null;
  zatca_status: string;
  created_at: string;
  updated_at: string;
  property?: { id: string; property_number: string; location: string } | null;
  contract?: { id: string; contract_number: string; tenant_name: string } | null;
}

export interface PaymentInvoice {
  id: string;
  contract_id: string;
  fiscal_year_id: string | null;
  invoice_number: string;
  payment_number: number;
  due_date: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'partially_paid';
  paid_date: string | null;
  paid_amount: number;
  notes: string | null;
  vat_rate: number;
  vat_amount: number;
  zatca_uuid: string | null;
  zatca_status: string;
  file_path: string | null;
  created_at: string;
  updated_at: string;
  contract?: {
    contract_number: string;
    tenant_name: string;
    property_id: string;
    payment_count: number;
    property?: { property_number: string } | null;
  };
}

/** بيانات معاينة الفاتورة — مُعاد تصديرها من invoiceTemplateUtils */
export type { InvoiceTemplateData as InvoicePreviewData } from '@/components/invoices/invoiceTemplateUtils';

/** خصم أو رسوم إضافية */
export interface AllowanceChargeItem {
  reason: string;
  amount: number;
  vatRate: number;
}
