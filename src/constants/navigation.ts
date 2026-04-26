/**
 * ثوابت التنقل والصلاحيات — مصدر واحد للحقيقة
 * منقول من components/layout/constants.ts لكسر الاعتماد المعكوس
 *
 * #26 من تقرير الفحص: مسار `/waqif` مُستخدم فعلياً في BottomNav, Sidebar,
 * useRoleRedirect, Index, Unauthorized. الادعاء بأنه "يتيم" غير دقيق — إبقاؤه إلزامي.
 *
 * #22/#23/#69 من الفحص العميق: تم نقل الأيقونات إلى `navigationIcons.ts`،
 * وإعادة بناء جميع maps المسارات (titles/labels/perms/sections) من
 * `routeRegistry.ts` الموحّد. الـ exports القديمة محفوظة بالكامل للتوافق العكسي.
 */
import {
  Building2, Home, FileText, Wallet, Users, BarChart3,
  DollarSign, Receipt, UserCog, Eye, Settings, MessageSquare,
  Bell, ShieldCheck, BookOpen, Lock, ArrowDownUp,
  ClipboardList, Calculator, Headset, GitBranch, GitCompareArrows, Activity, Mail,
} from '@/constants/navigationIcons';
import { ADMIN_SECTION_KEYS, BENEFICIARY_SECTION_KEYS, makeDefaults } from '@/constants/sections';
import {
  ADMIN_ROUTES,
  BENEFICIARY_ROUTES,
  ALL_ROUTES,
  buildLabelKeys,
  buildPermKeys,
  buildSectionKeys,
  buildTitles,
} from '@/constants/routeRegistry';

// ─── Map link keys to menu_labels keys (مبني من السجل الموحّد) ───
export const linkLabelKeys = {
  ...buildLabelKeys(ADMIN_ROUTES),
  ...buildLabelKeys(BENEFICIARY_ROUTES),
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
  { to: '/dashboard/diagnostics', icon: Activity, label: 'تشخيص النظام' },
  { to: '/dashboard/email-monitor', icon: Mail, label: 'مراقبة البريد' },
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

// ─── Permission maps (مبنية من السجل الموحّد #23) ───
export const ADMIN_ROUTE_PERM_KEYS: Record<string, string> = buildPermKeys(ADMIN_ROUTES);

/**
 * BENEFICIARY_ROUTE_PERM_KEYS — خريطة المسارات إلى مفاتيح الصلاحيات.
 * #24 من الفحص العميق: `/my-share` و `/carryforward` لهما الآن مفتاحان مستقلان
 * (`share` و `carryforward`) بدلاً من المشاركة في مفتاح واحد، لإتاحة تحكم مستقل.
 */
export const BENEFICIARY_ROUTE_PERM_KEYS: Record<string, string> = buildPermKeys(BENEFICIARY_ROUTES);

// ─── Routes accountant can never access ───
export const ACCOUNTANT_EXCLUDED_ROUTES = ['/dashboard/users', '/dashboard/settings', '/dashboard/zatca', '/dashboard/diagnostics', '/dashboard/email-monitor', '/beneficiary'];

// ─── Section visibility defaults (مشتقة من sections.ts — مصدر واحد للحقيقة #16/#17) ───
export const defaultAdminSections: Record<string, boolean> = makeDefaults(ADMIN_SECTION_KEYS);
export const defaultBeneficiarySections: Record<string, boolean> = makeDefaults(BENEFICIARY_SECTION_KEYS);

/** خريطة من المسار إلى مفتاح القسم — للوحة الناظر/المحاسب (مبنية من السجل) */
export const ADMIN_ROUTE_TO_SECTION: Record<string, string> = buildSectionKeys(ADMIN_ROUTES);

/** خريطة من المسار إلى مفتاح القسم — لواجهة المستفيد/الواقف (مبنية من السجل) */
export const BENEFICIARY_ROUTE_TO_SECTION: Record<string, string> = buildSectionKeys(BENEFICIARY_ROUTES);

// ─── Dynamic mobile header titles (مبنية من السجل الموحّد) ───
export const ROUTE_TITLES: Record<string, string> = buildTitles(ALL_ROUTES);
