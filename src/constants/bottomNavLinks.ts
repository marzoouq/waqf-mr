/**
 * روابط التنقل السفلي — مركزة حسب الدور.
 * ملاحظة (#21): الفصل عن `navigation.ts` مقصود — هذه قائمة مختصرة (4 عناصر فقط)
 * للهاتف، بينما `allAdminLinks`/`allBeneficiaryLinks` في navigation.ts قوائم
 * كاملة للقائمة الجانبية. مصدر الحقيقة للمسارات يبقى `navigation.ts`.
 */
import { DOMAIN_ICONS as I } from '@/constants/domainIcons';
import type { LucideIcon } from 'lucide-react';

export interface BottomNavLink {
  to: string;
  icon: LucideIcon;
  label: string;
}

export const BOTTOM_NAV_LINKS: Record<string, BottomNavLink[]> = {
  admin: [
    { to: '/dashboard', icon: I.home, label: 'الرئيسية' },
    { to: '/dashboard/properties', icon: I.property, label: 'العقارات' },
    { to: '/dashboard/contracts', icon: I.contract, label: 'العقود' },
    { to: '/dashboard/accounts', icon: I.accounts, label: 'الحسابات' },
  ],
  accountant: [
    { to: '/dashboard', icon: I.home, label: 'الرئيسية' },
    { to: '/dashboard/income', icon: I.income, label: 'الدخل' },
    { to: '/dashboard/expenses', icon: I.expense, label: 'المصروفات' },
    { to: '/dashboard/invoices', icon: I.invoice, label: 'الفواتير' },
  ],
  beneficiary: [
    { to: '/beneficiary', icon: I.home, label: 'الرئيسية' },
    { to: '/beneficiary/my-share', icon: I.share, label: 'حصتي' },
    { to: '/beneficiary/disclosure', icon: I.disclosure, label: 'الإفصاح' },
    { to: '/beneficiary/messages', icon: I.messages, label: 'المراسلات' },
  ],
  waqif: [
    { to: '/waqif', icon: I.home, label: 'الرئيسية' },
    { to: '/beneficiary/properties', icon: I.property, label: 'العقارات' },
    { to: '/beneficiary/contracts', icon: I.contract, label: 'العقود' },
    { to: '/beneficiary/accounts', icon: I.accounts, label: 'الحسابات' },
  ],
};
