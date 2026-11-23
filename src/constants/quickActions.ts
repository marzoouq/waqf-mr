/**
 * إجراءات سريعة مركزة حسب الدور.
 * ملاحظة (#22): الفصل عن `navigation.ts` مقصود — هذه بطاقات اختصارات بصرية
 * في لوحات التحكم (مع iconClass وألوان)، وليست روابط تنقل قياسية.
 * مصدر الحقيقة للمسارات/التسميات يبقى `navigation.ts`.
 */
import type { LucideIcon } from 'lucide-react';
import { DOMAIN_ICONS as I } from '@/constants/domainIcons';

export interface QuickActionItem {
  to: string;
  icon: LucideIcon;
  iconClass: string;
  label: string;
}

// الأيقونات من القاموس الموحّد — نفس المعنى بنفس الأيقونة في القائمة والشريط واللوحة
export const QUICK_ACTIONS: Record<string, QuickActionItem[]> = {
  accountant: [
    { to: '/dashboard/income', icon: I.income, iconClass: 'text-success', label: 'تسجيل دخل' },
    { to: '/dashboard/expenses', icon: I.expense, iconClass: 'text-destructive', label: 'تسجيل مصروف' },
    { to: '/dashboard/accounts', icon: I.accounts, iconClass: 'text-primary', label: 'الحسابات الختامية' },
    { to: '/dashboard/invoices', icon: I.invoice, iconClass: 'text-primary', label: 'إدارة الفواتير' },
    { to: '/dashboard/chart-of-accounts', icon: I.chartOfAccounts, iconClass: 'text-primary', label: 'الشجرة المحاسبية' },
    // إزالة `/dashboard/comparison` — admin-only، كان يسرّب رابطاً محجوباً للمحاسب
    { to: '/dashboard/annual-report', icon: I.annualReport, iconClass: 'text-secondary', label: 'التقرير السنوي' },
    { to: '/dashboard/reports', icon: I.reports, iconClass: 'text-primary', label: 'التقارير المالية' },
  ],
  admin: [
    { to: '/dashboard/contracts', icon: I.contract, iconClass: 'text-primary', label: 'العقود' },
    { to: '/dashboard/beneficiaries', icon: I.beneficiaries, iconClass: 'text-primary', label: 'المستفيدون' },
    { to: '/dashboard/accounts', icon: I.accounts, iconClass: 'text-primary', label: 'الحسابات' },
    { to: '/dashboard/zatca', icon: I.zatca, iconClass: 'text-primary', label: 'ZATCA' },
    { to: '/dashboard/comparison', icon: I.comparison, iconClass: 'text-primary', label: 'المقارنة' },
    { to: '/dashboard/annual-report', icon: I.annualReport, iconClass: 'text-secondary', label: 'التقرير السنوي' },
    { to: '/dashboard/reports', icon: I.reports, iconClass: 'text-primary', label: 'التقارير' },
    { to: '/dashboard/settings', icon: I.settings, iconClass: 'text-muted-foreground', label: 'الإعدادات' },
  ],
};
