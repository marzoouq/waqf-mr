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
