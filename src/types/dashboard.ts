/**
 * أنواع لوحة التحكم المشتركة
 */
import type { LucideIcon } from 'lucide-react';

export interface StatItem {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  link: string;
  yoyChange?: number | null;
  invertColor?: boolean;
  /**
   * صلاحية عرض البطاقة:
   * - 'all' (افتراضي) — تظهر لكل الأدوار المخوّلة بعرض اللوحة
   * - 'admin-only' — حصرية للناظر؛ تُحجب عن المحاسب
   * الفصل بناءً على metadata بدل النص العربي (مرونة i18n + سلامة الصلاحيات).
   */
  visibility?: 'all' | 'admin-only';
}

export interface KpiItem {
  label: string;
  value: number;
  suffix: string;
  color: string;
  progressColor: string;
  /** نسبة التغيير سنة بسنة (YoY) */
  yoyChange?: number | null;
  /** عكس اللون: ارتفاع = سيئ (مثل المصروفات) */
  invertColor?: boolean;
}
