/**
 * خريطة تحويل نوع المصروف (عربي) إلى قيمة `invoices.invoice_type` المدعومة.
 * القيم المسموحة في العمود: utilities | maintenance | rent | other
 */

export type SupportedInvoiceType = 'utilities' | 'maintenance' | 'other';

const MAP: Record<string, SupportedInvoiceType> = {
  'كهرباء': 'utilities',
  'مياه': 'utilities',
  'صيانة': 'maintenance',
  'عمالة': 'maintenance',
};

/** يُرجع نوع الفاتورة المقابل للمصروف، أو 'other' إن لم يوجد مطابق. */
export function mapExpenseTypeToInvoiceType(expenseType: string | null | undefined): SupportedInvoiceType {
  if (!expenseType) return 'other';
  return MAP[expenseType.trim()] ?? 'other';
}
