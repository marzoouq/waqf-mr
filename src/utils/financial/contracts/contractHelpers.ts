/** دالة موحدة لحساب عدد الدفعات حسب نوع الدفع */
export const getPaymentCount = (contract: { payment_type?: string | null; payment_count?: number | null }) => {
  switch (contract.payment_type) {
    case 'monthly': return 12;
    case 'quarterly': return 4;
    case 'semi_annual':
    case 'semi-annual': return 2;
    case 'annual': return 1;
    default: return contract.payment_count || 1;
  }
};

/** تسمية عربية لنوع الدفع */
export const getPaymentTypeLabel = (type?: string | null) =>
  type === 'monthly' ? 'شهري'
  : type === 'quarterly' ? 'ربع سنوي'
  : type === 'semi_annual' ? 'نصف سنوي'
  : type === 'annual' ? 'سنوي'
  : 'متعدد';

/**
 * حساب عدد الدفعات المتوقعة من نوع الدفع ومدة العقد بالأشهر.
 * يختلف عن getPaymentCount لأن العقد قد لا يغطي سنة كاملة.
 */
export const getPaymentCountFromMonths = (
  paymentType: string,
  months: number,
  paymentCount?: number | null,
): number => {
  if (paymentType === 'monthly') return months;
  if (paymentType === 'quarterly') return Math.max(1, Math.ceil(months / 3));
  if (paymentType === 'semi_annual' || paymentType === 'semi-annual') return Math.max(1, Math.ceil(months / 6));
  if (paymentType === 'annual') return Math.max(1, Math.ceil(months / 12));
  if (paymentType === 'multi') return paymentCount || 1;
  return 1;
};

/** تسمية حالة العقد بالعربية */
export const getContractStatusLabel = (status: string): string => {
  switch (status) {
    case 'active': return 'نشط';
    case 'expired': return 'منتهي';
    case 'cancelled': return 'ملغي';
    default: return status;
  }
};
