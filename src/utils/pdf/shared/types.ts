/**
 * أنواع مشتركة لفواتير الدفعات
 */

export type InvoiceTemplate = 'classic' | 'tax_professional' | 'compact';

export interface PaymentInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

/** خصم أو رسوم إضافية — مطابق لـ AllowanceChargeItem في HTML */
export interface PdfAllowanceChargeItem {
  reason: string;
  amount: number;
  vatRate: number;
}

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
  tenantVatNumber?: string;
  tenantAddress?: string;
  /** بنود متعددة اختيارية — إذا لم تُوفّر يُولّد صف إيجار واحد */
  lineItems?: PaymentInvoiceLineItem[];
  /** خصومات (AllowanceCharge - Allowance) */
  allowances?: PdfAllowanceChargeItem[];
  /** رسوم إضافية (AllowanceCharge - Charge) */
  charges?: PdfAllowanceChargeItem[];
}
