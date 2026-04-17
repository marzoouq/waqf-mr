/**
 * روابط التنقل السفلي — مركزة حسب الدور.
 * ملاحظة (#21): الفصل عن `navigation.ts` مقصود — هذه قائمة مختصرة (4 عناصر فقط)
 * للهاتف، بينما `allAdminLinks`/`allBeneficiaryLinks` في navigation.ts قوائم
 * كاملة للقائمة الجانبية. مصدر الحقيقة للمسارات يبقى `navigation.ts`.
 */
import { Home, Building2, FileText, Wallet, ClipboardList, Receipt, TrendingUp, TrendingDown, MessageSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface BottomNavLink {
  to: string;
  icon: LucideIcon;
  label: string;
}

export const BOTTOM_NAV_LINKS: Record<string, BottomNavLink[]> = {
  admin: [
    { to: '/dashboard', icon: Home, label: 'الرئيسية' },
    { to: '/dashboard/properties', icon: Building2, label: 'العقارات' },
    { to: '/dashboard/contracts', icon: FileText, label: 'العقود' },
    { to: '/dashboard/accounts', icon: Wallet, label: 'الحسابات' },
  ],
  accountant: [
    { to: '/dashboard', icon: Home, label: 'الرئيسية' },
    { to: '/dashboard/income', icon: TrendingUp, label: 'الدخل' },
    { to: '/dashboard/expenses', icon: TrendingDown, label: 'المصروفات' },
    { to: '/dashboard/invoices', icon: Receipt, label: 'الفواتير' },
  ],
  beneficiary: [
    { to: '/beneficiary', icon: Home, label: 'الرئيسية' },
    { to: '/beneficiary/my-share', icon: Wallet, label: 'حصتي' },
    { to: '/beneficiary/disclosure', icon: ClipboardList, label: 'الإفصاح' },
    { to: '/beneficiary/messages', icon: MessageSquare, label: 'المراسلات' },
  ],
  waqif: [
    { to: '/waqif', icon: Home, label: 'الرئيسية' },
    { to: '/beneficiary/properties', icon: Building2, label: 'العقارات' },
    { to: '/beneficiary/contracts', icon: FileText, label: 'العقود' },
    { to: '/beneficiary/accounts', icon: Wallet, label: 'الحسابات' },
  ],
};
