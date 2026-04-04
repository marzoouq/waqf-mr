/**
 * ثوابت ودوال مشتركة للرسوم البيانية (Recharts)
 * تُستخدم في: DashboardChartsInner, FinancialChartsInner, WaqifChartsInner
 */

/** ألوان الرسوم البيانية — تستخدم متغيرات CSS الدلالية */
export const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--info))',
  'hsl(var(--success))',
  'hsl(var(--destructive))',
  'hsl(var(--warning))',
  'hsl(var(--accent-foreground))',
  'hsl(var(--muted-foreground))',
];

/** ترجمة أرقام الأشهر إلى العربية */
export const ARABIC_MONTHS: Record<string, string> = {
  '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل',
  '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس',
  '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر',
};

/** تنسيق شهر بصيغة YYYY-MM إلى اسم الشهر العربي */
export const formatArabicMonth = (month: unknown): string => {
  const s = String(month ?? '');
  const parts = s.split('-');
  return (parts[1] ? ARABIC_MONTHS[parts[1]] : undefined) || s;
};

/** نمط Tooltip عربي موحّد */
export const tooltipStyleRtl = {
  direction: 'rtl' as const,
  textAlign: 'right' as const,
  fontFamily: 'inherit',
};
