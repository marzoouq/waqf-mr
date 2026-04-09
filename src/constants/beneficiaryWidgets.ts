/**
 * ثوابت عناصر لوحة المستفيد القابلة للتحكم
 */
export const BENEFICIARY_WIDGET_KEYS = [
  'welcome_card',
  'stats_row',
  'fiscal_year_notice',
  'advance_card',
  'quick_links',
  'recent_distributions',
  'notifications_card',
] as const;

export const BENEFICIARY_WIDGET_LABELS: Record<string, string> = {
  welcome_card: 'بطاقة الترحيب',
  stats_row: 'صف الإحصائيات',
  fiscal_year_notice: 'تنبيه السنة المالية',
  advance_card: 'بطاقة طلب السُلفة',
  quick_links: 'الروابط السريعة',
  recent_distributions: 'آخر التوزيعات',
  notifications_card: 'بطاقة الإشعارات',
};

