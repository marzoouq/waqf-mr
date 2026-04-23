/**
 * #DRY — تصنيف تبويبات الإعدادات
 * مفصول عن SettingsPage.tsx لسهولة الإضافة والاختبار
 */
import {
  Building2, Palette, Bell, ShieldCheck, Shield, Globe, Download, Calendar,
  Megaphone, LayoutList, FlaskConical, Fingerprint, Banknote, FileText,
  MessageSquare, ServerCog, type LucideIcon,
} from 'lucide-react';

export interface SettingsTab {
  value: string;
  label: string;
  icon: LucideIcon;
}

export interface SettingsCategory {
  label: string;
  tabs: SettingsTab[];
}

export const SETTINGS_CATEGORIES: SettingsCategory[] = [
  {
    label: 'الهوية والمظهر',
    tabs: [
      { value: 'waqf', label: 'بيانات الوقف', icon: Building2 },
      { value: 'landing', label: 'الواجهة الرئيسية', icon: Globe },
      { value: 'appearance', label: 'المظهر', icon: Palette },
      { value: 'banner', label: 'شريط التنبيه', icon: FlaskConical },
    ],
  },
  {
    label: 'المالية',
    tabs: [
      { value: 'fiscal', label: 'السنوات المالية', icon: Calendar },
      { value: 'advances', label: 'السُلف', icon: Banknote },
      { value: 'zatca', label: 'الضريبة (ZATCA)', icon: FileText },
    ],
  },
  {
    label: 'المستخدمون والأقسام',
    tabs: [
      { value: 'permissions', label: 'إدارة الصلاحيات', icon: Shield },
      { value: 'menu', label: 'القائمة', icon: LayoutList },
    ],
  },
  {
    label: 'النظام',
    tabs: [
      { value: 'notifications', label: 'الإشعارات', icon: Bell },
      { value: 'bulk-notify', label: 'إشعارات جماعية', icon: Megaphone },
      { value: 'bulk-message', label: 'رسائل جماعية', icon: MessageSquare },
      { value: 'export', label: 'تصدير البيانات', icon: Download },
      { value: 'biometric', label: 'البصمة', icon: Fingerprint },
      { value: 'security', label: 'الأمان', icon: ShieldCheck },
      { value: 'system', label: 'إعدادات متقدمة', icon: ServerCog },
    ],
  },
];
