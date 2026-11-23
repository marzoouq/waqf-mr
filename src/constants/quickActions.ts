/**
 * إجراءات سريعة مركزة حسب الدور، مقسّمة إلى مسارات عمل.
 * ملاحظة (#22): الفصل عن `navigation.ts` مقصود — هذه بطاقات اختصارات بصرية
 * في لوحات التحكم (مع iconClass وألوان)، وليست روابط تنقل قياسية.
 * مصدر الحقيقة للمسارات/التسميات يبقى `navigation.ts`.
 */
import type { LucideIcon } from 'lucide-react';
import { DOMAIN_ICONS as I } from '@/constants/domainIcons';

export type QuickActionGroup = 'leasing' | 'finance' | 'governance';

export interface QuickActionItem {
  to: string;
  icon: LucideIcon;
  iconClass: string;
  label: string;
  group: QuickActionGroup;
}

/** عناوين مسارات العمل بالترتيب المعروض */
export const QUICK_ACTION_GROUPS: ReadonlyArray<{ id: QuickActionGroup; title: string }> = [
  { id: 'leasing', title: 'التأجير والتحصيل' },
  { id: 'finance', title: 'المحاسبة والصرف' },
  { id: 'governance', title: 'المستفيدون والحوكمة' },
];

// الأيقونات من القاموس الموحّد — نفس المعنى بنفس الأيقونة في القائمة والشريط واللوحة
export const QUICK_ACTIONS: Record<string, QuickActionItem[]> = {
  accountant: [
    { to: '/dashboard/income', icon: I.income, iconClass: 'text-success', label: 'تسجيل دخل', group: 'leasing' },
    { to: '/dashboard/invoices', icon: I.invoice, iconClass: 'text-primary', label: 'إدارة الفواتير', group: 'leasing' },
    { to: '/dashboard/expenses', icon: I.expense, iconClass: 'text-destructive', label: 'تسجيل مصروف', group: 'finance' },
    { to: '/dashboard/accounts', icon: I.accounts, iconClass: 'text-primary', label: 'الحسابات الختامية', group: 'finance' },
    { to: '/dashboard/chart-of-accounts', icon: I.chartOfAccounts, iconClass: 'text-primary', label: 'الشجرة المحاسبية', group: 'finance' },
    // إزالة `/dashboard/comparison` — admin-only، كان يسرّب رابطاً محجوباً للمحاسب
    { to: '/dashboard/annual-report', icon: I.annualReport, iconClass: 'text-secondary', label: 'التقرير السنوي', group: 'governance' },
    { to: '/dashboard/reports', icon: I.reports, iconClass: 'text-primary', label: 'التقارير المالية', group: 'governance' },
  ],
  admin: [
    { to: '/dashboard/properties', icon: I.property, iconClass: 'text-primary', label: 'العقارات', group: 'leasing' },
    { to: '/dashboard/contracts', icon: I.contract, iconClass: 'text-primary', label: 'العقود', group: 'leasing' },
    { to: '/dashboard/invoices', icon: I.invoice, iconClass: 'text-primary', label: 'الفواتير', group: 'leasing' },
    { to: '/dashboard/zatca', icon: I.zatca, iconClass: 'text-primary', label: 'ZATCA', group: 'leasing' },
    { to: '/dashboard/expenses', icon: I.expense, iconClass: 'text-destructive', label: 'المصروفات', group: 'finance' },
    { to: '/dashboard/accounts', icon: I.accounts, iconClass: 'text-primary', label: 'الحسابات', group: 'finance' },
    { to: '/dashboard/distributions', icon: I.distribution, iconClass: 'text-success', label: 'التوزيعات', group: 'finance' },
    { to: '/dashboard/comparison', icon: I.comparison, iconClass: 'text-primary', label: 'المقارنة', group: 'finance' },
    { to: '/dashboard/beneficiaries', icon: I.beneficiaries, iconClass: 'text-primary', label: 'المستفيدون', group: 'governance' },
    { to: '/dashboard/reports', icon: I.reports, iconClass: 'text-primary', label: 'التقارير', group: 'governance' },
    { to: '/dashboard/annual-report', icon: I.annualReport, iconClass: 'text-secondary', label: 'التقرير السنوي', group: 'governance' },
    { to: '/dashboard/settings', icon: I.settings, iconClass: 'text-muted-foreground', label: 'الإعدادات', group: 'governance' },
  ],
};
