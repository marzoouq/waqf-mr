/**
 * إجراءات سريعة مركزة حسب الدور
 */
import { FileText, TrendingUp, TrendingDown, Users, Wallet, Printer, Gauge, ArrowUpDown, Landmark, GitBranch, Receipt, BarChart3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface QuickActionItem {
  to: string;
  icon: LucideIcon;
  iconClass: string;
  label: string;
}

export const QUICK_ACTIONS: Record<string, QuickActionItem[]> = {
  accountant: [
    { to: '/dashboard/income', icon: TrendingUp, iconClass: 'text-success', label: 'تسجيل دخل' },
    { to: '/dashboard/expenses', icon: TrendingDown, iconClass: 'text-destructive', label: 'تسجيل مصروف' },
    { to: '/dashboard/accounts', icon: FileText, iconClass: 'text-primary', label: 'الحسابات الختامية' },
    { to: '/dashboard/invoices', icon: FileText, iconClass: 'text-secondary', label: 'إدارة الفواتير' },
    { to: '/dashboard/chart-of-accounts', icon: GitBranch, iconClass: 'text-accent-foreground', label: 'الشجرة المحاسبية' },
    { to: '/dashboard/comparison', icon: ArrowUpDown, iconClass: 'text-muted-foreground', label: 'المقارنة التاريخية' },
    { to: '/dashboard/annual-report', icon: Printer, iconClass: 'text-primary', label: 'التقرير السنوي' },
    { to: '/dashboard/reports', icon: Gauge, iconClass: 'text-secondary', label: 'التقارير المالية' },
  ],
  admin: [
    { to: '/dashboard/contracts', icon: FileText, iconClass: 'text-primary', label: 'مراجعة العقود' },
    { to: '/dashboard/beneficiaries', icon: Users, iconClass: 'text-success', label: 'إدارة المستفيدين' },
    { to: '/dashboard/accounts', icon: Landmark, iconClass: 'text-secondary', label: 'الحسابات الختامية' },
    { to: '/dashboard/zatca', icon: Receipt, iconClass: 'text-warning', label: 'ZATCA' },
    { to: '/dashboard/comparison', icon: ArrowUpDown, iconClass: 'text-accent-foreground', label: 'المقارنة التاريخية' },
    { to: '/dashboard/annual-report', icon: Printer, iconClass: 'text-primary', label: 'التقرير السنوي' },
    { to: '/dashboard/reports', icon: BarChart3, iconClass: 'text-muted-foreground', label: 'التقارير' },
    { to: '/dashboard/settings', icon: Gauge, iconClass: 'text-foreground', label: 'الإعدادات' },
  ],
};
