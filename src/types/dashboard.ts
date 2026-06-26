/**
 * أنواع لوحة التحكم المشتركة
 */
import type { LucideIcon } from 'lucide-react';

export type TrendColor = 'primary' | 'success' | 'destructive' | 'warning';

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
  /** القيمة العددية الأصلية — تُستخدم لتشغيل AnimatedCounter (إن وُجدت يستبدل value المُنسّق) */
  rawValue?: number;
  /** عدد المنازل العشرية في AnimatedCounter */
  decimals?: number;
  /** بادئة (مثل رمز عملة) لـ AnimatedCounter */
  prefix?: string;
  /** لاحقة عددية لـ AnimatedCounter (مثل ' ر.س' أو '%') */
  numericSuffix?: string;
  /** سلسلة اتجاه آخر فترة (لرسم MiniSparkline) */
  trend?: number[];
  /** لون الـ MiniSparkline */
  trendColor?: TrendColor;
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
  /** عدد المنازل العشرية لـ AnimatedCounter (افتراضي 0) */
  decimals?: number;
}
