/**
 * دوال تحديد variant الـ Badge حسب الحالة — مركزة لتوحيد الاستخدام
 */

/** variant badge حالة الفاتورة */
export const invoiceStatusBadgeVariant = (status: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
  if (status === 'paid') return 'default';
  if (status === 'cancelled' || status === 'overdue') return 'destructive';
  return 'secondary';
};
