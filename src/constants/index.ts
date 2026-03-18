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
  { value: 'amber', label: 'ذهبي', className: 'bg-warning' },
  { value: 'blue', label: 'أزرق', className: 'bg-info' },
  { value: 'green', label: 'أخضر', className: 'bg-success' },
  { value: 'red', label: 'أحمر', className: 'bg-destructive' },
  { value: 'purple', label: 'بنفسجي', className: 'bg-status-special' },
] as const;

export const BANNER_COLOR_CLASSES: Record<string, string> = {
  amber: 'bg-warning hover:bg-warning/90',
  blue: 'bg-info hover:bg-info/90',
  green: 'bg-success hover:bg-success/90',
  red: 'bg-destructive hover:bg-destructive/90',
  purple: 'bg-status-special hover:bg-status-special/90',
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

// ─── أدوار المستخدمين ───
export const ROLE_LABELS: Record<string, string> = {
  admin: 'ناظر الوقف',
  beneficiary: 'مستفيد',
  waqif: 'واقف',
  accountant: 'محاسب',
};
