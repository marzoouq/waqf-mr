/**
 * ثوابت واجهة المستخدم — ألوان وإعدادات شريط التنبيه
 */

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
