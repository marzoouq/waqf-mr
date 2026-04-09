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
