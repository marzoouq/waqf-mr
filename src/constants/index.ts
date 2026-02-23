/**
 * الثوابت المركزية للتطبيق
 * يجمع القيم المتكررة المستخدمة في عدة مكونات
 */

// ─── أنواع المصروفات ───
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

// ─── ألوان شريط التنبيه ───
export const BANNER_COLORS = [
  { value: 'amber', label: 'ذهبي', className: 'bg-amber-500' },
  { value: 'blue', label: 'أزرق', className: 'bg-blue-500' },
  { value: 'green', label: 'أخضر', className: 'bg-green-600' },
  { value: 'red', label: 'أحمر', className: 'bg-red-500' },
  { value: 'purple', label: 'بنفسجي', className: 'bg-purple-500' },
] as const;

export const BANNER_COLOR_CLASSES: Record<string, string> = {
  amber: 'bg-amber-500 hover:bg-amber-600',
  blue: 'bg-blue-500 hover:bg-blue-600',
  green: 'bg-green-600 hover:bg-green-700',
  red: 'bg-red-500 hover:bg-red-600',
  purple: 'bg-purple-500 hover:bg-purple-600',
};

// ─── إعدادات شريط التنبيه الافتراضية ───
export interface BannerSettings {
  enabled: boolean;
  text: string;
  color: string;
  position: string;
  dismissible: boolean;
}

export const DEFAULT_BANNER_SETTINGS: BannerSettings = {
  enabled: true,
  text: 'إصدار تجريبي — نعمل على تطويره من أجلكم ونرحب بملاحظاتكم',
  color: 'amber',
  position: 'top',
  dismissible: true,
};

// ─── أنواع الوحدات ───
export const UNIT_TYPES = [
  'شقة',
  'محل',
  'مكتب',
  'مستودع',
  'موقف',
] as const;

// ─── أدوار المستخدمين ───
export const ROLE_LABELS: Record<string, string> = {
  admin: 'ناظر الوقف',
  beneficiary: 'مستفيد',
  waqif: 'واقف',
  accountant: 'محاسب',
};
