/**
 * دوال مساعدة مشتركة للعقود — حالة العقد ومعلومات العرض
 */

interface ContractStatusInfo {
  label: string;
  className: string;
}

/** تعيد النص واللون حسب حالة العقد */
export const getContractStatusInfo = (status: string): ContractStatusInfo => {
  switch (status) {
    case 'active':
      return { label: 'نشط', className: 'bg-success/20 text-success' };
    case 'cancelled':
      return { label: 'ملغي', className: 'bg-warning/20 text-warning' };
    default:
      return { label: 'منتهي', className: 'bg-destructive/20 text-destructive' };
  }
};

/**
 * الحالة الظاهرة للعقد: «منتهي» إذا تجاوز تاريخ الانتهاء ولو بقي محفوظاً «نشط».
 * عرض فقط — لا يكتب شيئاً في قاعدة البيانات (السنة المقفلة لا تُمس).
 */
export const getEffectiveContractStatus = (
  status: string | null | undefined,
  endDate: string | null | undefined,
  today: string = new Date().toISOString().slice(0, 10),
): string => {
  if (status === 'active' && endDate && endDate.slice(0, 10) < today) return 'expired';
  return status ?? '';
};
