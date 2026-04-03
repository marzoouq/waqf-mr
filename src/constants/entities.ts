/**
 * ثوابت كيانات المجال — أنواع العقارات والمصروفات والعقود
 */

// ─── أنواع المصروفات ───
// ⚠️ لا تُضف "ضريبة القيمة المضافة" أو "VAT" — الضريبة تُدار من الحسابات الختامية تلقائياً
export const EXPENSE_TYPES = [
  'كهرباء',
  'مياه',
  'صيانة',
  'عمالة',
  'منصة إيجار',
  'كتابة عقود',
  'تأمين',
  'ضرائب',
  'أخرى',
] as const;

export type ExpenseType = (typeof EXPENSE_TYPES)[number];

// ─── أنواع العقارات ───
export const PROPERTY_TYPES = [
  'شقة',
  'محل تجاري',
  'مبنى',
  'أرض',
  'فيلا',
  'مستودع',
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

// ─── حالات العقود ───
export const CONTRACT_STATUSES = {
  active: 'ساري',
  expired: 'منتهي',
  cancelled: 'ملغي',
} as const;

// ─── أنواع الدفع ───
export const PAYMENT_TYPES = {
  monthly: 'شهري',
  quarterly: 'ربع سنوي',
  semi_annual: 'نصف سنوي',
  annual: 'سنوي',
} as const;

// ─── أنواع الوحدات ───
export const UNIT_TYPES = [
  'شقة',
  'محل',
  'مكتب',
  'مستودع',
  'موقف',
] as const;

// ─── أنواع هوية المستأجر ───
export const TENANT_ID_TYPES = [
  { value: 'NAT', label: 'هوية وطنية' },
  { value: 'CRN', label: 'سجل تجاري' },
  { value: 'IQA', label: 'إقامة' },
  { value: 'PAS', label: 'جواز سفر' },
  { value: 'TIN', label: 'رقم ضريبي' },
] as const;

// ─── ثوابت العقود ───
export const EXPIRING_SOON_DAYS = 90;
