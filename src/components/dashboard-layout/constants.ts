/**
 * ثوابت وإعدادات التخطيط العام للوحة التحكم
 * تم استخراجها من DashboardLayout لتقليل حجم الملف الأصلي
 */
import {
  Building2, Home, FileText, Wallet, Users, BarChart3,
  DollarSign, Receipt, UserCog, Eye, Settings, MessageSquare,
  Bell, ShieldCheck, BookOpen, Lock, ArrowDownUp,
  ClipboardList, Calculator, Headset, GitBranch, GitCompareArrows, Activity,
} from 'lucide-react';
import type { MenuLabels } from '@/components/settings/MenuCustomizationTab';

// ─── Map link keys to menu_labels keys ───
export const linkLabelKeys: Record<string, keyof MenuLabels> = {
  '/dashboard': 'home',
  '/dashboard/properties': 'properties',
  '/dashboard/contracts': 'contracts',
  '/dashboard/income': 'income',
  '/dashboard/expenses': 'expenses',
  '/dashboard/beneficiaries': 'beneficiaries',
  '/dashboard/reports': 'reports',
  '/dashboard/accounts': 'accounts',
  '/dashboard/users': 'users',
  '/dashboard/settings': 'settings',
  '/dashboard/messages': 'messages',
  '/dashboard/invoices': 'invoices',
  '/dashboard/audit-log': 'audit_log',
  '/dashboard/bylaws': 'bylaws',
  '/dashboard/chart-of-accounts': 'chart_of_accounts',
  '/beneficiary': 'beneficiary_view',
};

// ─── Navigation links ───
export const allAdminLinks = [
  { to: '/dashboard', icon: Home, label: 'الرئيسية' },
  { to: '/dashboard/properties', icon: Building2, label: 'العقارات' },
  { to: '/dashboard/contracts', icon: FileText, label: 'العقود' },
  { to: '/dashboard/income', icon: DollarSign, label: 'الدخل' },
  { to: '/dashboard/expenses', icon: Receipt, label: 'المصروفات' },
  { to: '/dashboard/beneficiaries', icon: Users, label: 'المستفيدين' },
  { to: '/dashboard/reports', icon: BarChart3, label: 'التقارير' },
  { to: '/dashboard/accounts', icon: Wallet, label: 'الحسابات' },
  { to: '/dashboard/users', icon: UserCog, label: 'إدارة المستخدمين' },
  { to: '/dashboard/settings', icon: Settings, label: 'الإعدادات' },
  { to: '/dashboard/messages', icon: MessageSquare, label: 'المراسلات' },
  { to: '/dashboard/invoices', icon: FileText, label: 'الفواتير' },
  { to: '/dashboard/audit-log', icon: ShieldCheck, label: 'سجل المراجعة' },
  { to: '/dashboard/bylaws', icon: BookOpen, label: 'اللائحة التنظيمية' },
  { to: '/dashboard/zatca', icon: Lock, label: 'إدارة ZATCA' },
  { to: '/dashboard/support', icon: Headset, label: 'الدعم الفني' },
  { to: '/dashboard/annual-report', icon: ClipboardList, label: 'التقرير السنوي' },
  { to: '/dashboard/chart-of-accounts', icon: GitBranch, label: 'الشجرة المحاسبية' },
  { to: '/dashboard/comparison', icon: GitCompareArrows, label: 'المقارنة التاريخية' },
  { to: '/beneficiary', icon: Eye, label: 'واجهة المستفيد' },
];

export const allBeneficiaryLinks = [
  { to: '/beneficiary', icon: Home, label: 'الرئيسية' },
  { to: '/beneficiary/properties', icon: Building2, label: 'العقارات' },
  { to: '/beneficiary/contracts', icon: FileText, label: 'العقود' },
  { to: '/beneficiary/disclosure', icon: ClipboardList, label: 'الإفصاح السنوي' },
  { to: '/beneficiary/my-share', icon: Wallet, label: 'حصتي من الريع' },
  { to: '/beneficiary/carryforward', icon: ArrowDownUp, label: 'الترحيلات والخصومات' },
  { to: '/beneficiary/financial-reports', icon: BarChart3, label: 'التقارير المالية' },
  { to: '/beneficiary/accounts', icon: Calculator, label: 'الحسابات الختامية' },
  { to: '/beneficiary/messages', icon: MessageSquare, label: 'المراسلات' },
  { to: '/beneficiary/notifications', icon: Bell, label: 'سجل الإشعارات' },
  { to: '/beneficiary/invoices', icon: Receipt, label: 'الفواتير' },
  { to: '/beneficiary/bylaws', icon: BookOpen, label: 'اللائحة التنظيمية' },
  { to: '/beneficiary/support', icon: Headset, label: 'الدعم الفني' },
  { to: '/beneficiary/annual-report', icon: ClipboardList, label: 'التقرير السنوي' },
  { to: '/beneficiary/settings', icon: Settings, label: 'الإعدادات' },
];

// ─── Routes that support "All Years" filter ───
export const SHOW_ALL_ROUTES = [
  '/dashboard/income',
  '/dashboard/expenses',
  '/dashboard/contracts',
  '/dashboard/properties',
  '/dashboard/invoices',
  '/dashboard/audit-log',
];

// ─── Permission maps ───
export const ADMIN_ROUTE_PERM_KEYS: Record<string, string> = {
  '/dashboard/properties': 'properties',
  '/dashboard/contracts': 'contracts',
  '/dashboard/income': 'income',
  '/dashboard/expenses': 'expenses',
  '/dashboard/beneficiaries': 'beneficiaries',
  '/dashboard/reports': 'reports',
  '/dashboard/accounts': 'accounts',
  '/dashboard/invoices': 'invoices',
  '/dashboard/bylaws': 'bylaws',
  '/dashboard/messages': 'messages',
  '/dashboard/audit-log': 'audit_log',
  '/dashboard/annual-report': 'annual_report',
  '/dashboard/support': 'support',
  '/dashboard/chart-of-accounts': 'chart_of_accounts',
};

export const BENEFICIARY_ROUTE_PERM_KEYS: Record<string, string> = {
  '/beneficiary/properties': 'properties',
  '/beneficiary/contracts': 'contracts',
  '/beneficiary/disclosure': 'disclosure',
  '/beneficiary/my-share': 'share',
  '/beneficiary/carryforward': 'share',
  '/beneficiary/financial-reports': 'reports',
  '/beneficiary/accounts': 'accounts',
  '/beneficiary/invoices': 'invoices',
  '/beneficiary/bylaws': 'bylaws',
  '/beneficiary/messages': 'messages',
  '/beneficiary/notifications': 'notifications',
  '/beneficiary/annual-report': 'annual_report',
  '/beneficiary/support': 'support',
};

// ─── Routes accountant can never access ───
export const ACCOUNTANT_EXCLUDED_ROUTES = ['/dashboard/users', '/dashboard/settings', '/dashboard/zatca'];

// ─── Section visibility defaults ───
export const defaultAdminSections = {
  properties: true, contracts: true, income: true, expenses: true,
  beneficiaries: true, reports: true, accounts: true, users: true,
  invoices: true, bylaws: true, messages: true, audit_log: true,
  annual_report: true, support: true, chart_of_accounts: true,
};

export const defaultBeneficiarySections = {
  properties: true, contracts: true, disclosure: true, share: true,
  accounts: true, reports: true, invoices: true, bylaws: true,
  messages: true, notifications: true, annual_report: true, support: true,
};

export const ADMIN_SECTION_KEYS: Record<string, string> = {
  '/dashboard/properties': 'properties',
  '/dashboard/contracts': 'contracts',
  '/dashboard/income': 'income',
  '/dashboard/expenses': 'expenses',
  '/dashboard/beneficiaries': 'beneficiaries',
  '/dashboard/reports': 'reports',
  '/dashboard/accounts': 'accounts',
  '/dashboard/users': 'users',
  '/dashboard/invoices': 'invoices',
  '/dashboard/bylaws': 'bylaws',
  '/dashboard/messages': 'messages',
  '/dashboard/audit-log': 'audit_log',
  '/dashboard/annual-report': 'annual_report',
  '/dashboard/support': 'support',
  '/dashboard/chart-of-accounts': 'chart_of_accounts',
};

export const BENEFICIARY_SECTION_KEYS: Record<string, string> = {
  '/beneficiary/properties': 'properties',
  '/beneficiary/contracts': 'contracts',
  '/beneficiary/disclosure': 'disclosure',
  '/beneficiary/my-share': 'share',
  '/beneficiary/carryforward': 'share',
  '/beneficiary/accounts': 'accounts',
  '/beneficiary/financial-reports': 'reports',
  '/beneficiary/invoices': 'invoices',
  '/beneficiary/bylaws': 'bylaws',
  '/beneficiary/messages': 'messages',
  '/beneficiary/notifications': 'notifications',
  '/beneficiary/annual-report': 'annual_report',
  '/beneficiary/support': 'support',
};

// ─── Dynamic mobile header titles ───
export const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'الرئيسية',
  '/dashboard/properties': 'العقارات',
  '/dashboard/contracts': 'العقود',
  '/dashboard/income': 'الدخل',
  '/dashboard/expenses': 'المصروفات',
  '/dashboard/beneficiaries': 'المستفيدين',
  '/dashboard/reports': 'التقارير',
  '/dashboard/accounts': 'الحسابات',
  '/dashboard/users': 'إدارة المستخدمين',
  '/dashboard/settings': 'الإعدادات',
  '/dashboard/messages': 'المراسلات',
  '/dashboard/invoices': 'الفواتير',
  '/dashboard/audit-log': 'سجل المراجعة',
  '/dashboard/bylaws': 'اللائحة التنظيمية',
  '/dashboard/zatca': 'إدارة ZATCA',
  '/dashboard/annual-report': 'التقرير السنوي',
  '/dashboard/support': 'الدعم الفني',
  '/dashboard/chart-of-accounts': 'الشجرة المحاسبية',
  '/dashboard/comparison': 'المقارنة التاريخية',
  '/dashboard/diagnostics': 'تشخيص النظام',
  '/beneficiary': 'الرئيسية',
  '/beneficiary/properties': 'العقارات',
  '/beneficiary/contracts': 'العقود',
  '/beneficiary/disclosure': 'الإفصاح السنوي',
  '/beneficiary/my-share': 'حصتي من الريع',
  '/beneficiary/carryforward': 'الترحيلات والخصومات',
  '/beneficiary/financial-reports': 'التقارير المالية',
  '/beneficiary/accounts': 'الحسابات الختامية',
  '/beneficiary/messages': 'المراسلات',
  '/beneficiary/notifications': 'سجل الإشعارات',
  '/beneficiary/invoices': 'الفواتير',
  '/beneficiary/bylaws': 'اللائحة التنظيمية',
  '/beneficiary/settings': 'الإعدادات',
  '/beneficiary/support': 'الدعم الفني',
  '/beneficiary/annual-report': 'التقرير السنوي',
  '/waqif': 'لوحة الواقف',
};
