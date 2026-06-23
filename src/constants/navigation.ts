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
  DollarSign, Receipt, ReceiptText, UserCog, Eye, Settings, MessageSquare,
  Bell, ShieldCheck, BookOpen, Lock, ArrowDownUp,
  ClipboardList, Calculator, Headset, GitBranch, GitCompareArrows, Activity, Mail,
  TrendingDown, Share2, FolderArchive,
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
// ─── Navigation links ───
// P3/A7: `allAdminLinks` يُولَّد آليًا من ADMIN_ROUTES بدلاً من الكتابة اليدوية.
// أي مسار جديد يُضاف للسجل + خريطة الأيقونات أدناه يظهر تلقائيًا في القائمة.
// الترتيب يتبع ترتيب الإدخال في `ADMIN_ROUTES`.

/** أيقونات الروابط — مفصولة عن السجل لتجنّب سحب Lucide إلى مستهلكي الميتاداتا فقط */
const ADMIN_ROUTE_ICONS: Record<string, typeof Home> = {
  '/dashboard': Home,
  '/dashboard/properties': Building2,
  '/dashboard/contracts': FileText,
  '/dashboard/income': DollarSign,
  '/dashboard/expenses': Receipt,
  '/dashboard/beneficiaries': Users,
  '/dashboard/reports': BarChart3,
  '/dashboard/accounts': Wallet,
  '/dashboard/distributions': Share2,
  '/dashboard/users': UserCog,
  '/dashboard/settings': Settings,
  '/dashboard/messages': MessageSquare,
  '/dashboard/invoices': ReceiptText,
  '/dashboard/audit-log': ShieldCheck,
  '/dashboard/bylaws': BookOpen,
  '/dashboard/archive': FolderArchive,
  '/dashboard/zatca': Lock,
  '/dashboard/annual-report': ClipboardList,
  '/dashboard/support': Headset,
  '/dashboard/chart-of-accounts': GitBranch,
  '/dashboard/comparison': GitCompareArrows,
  '/dashboard/diagnostics': Activity,
  '/dashboard/email-monitor': Mail,
};

/** مسارات مسجَّلة في ADMIN_ROUTES لكنها مُخفاة من القائمة الجانبية عمدًا.
 *  P1/C3: تقارير التدقيق الجنائي والتنظيف يُوصل إليهما عبر أزرار داخل /dashboard/audit-log. */
const ADMIN_SIDEBAR_HIDDEN = new Set<string>([
  '/dashboard/audit-report-final',
  '/dashboard/cleanup-report',
]);

export const allAdminLinks = [
  ...Object.entries(ADMIN_ROUTES)
    .filter(([to]) => !ADMIN_SIDEBAR_HIDDEN.has(to))
    .map(([to, meta]) => {
      const icon = ADMIN_ROUTE_ICONS[to];
      if (!icon) throw new Error(`[navigation] ADMIN_ROUTE_ICONS مفقود للمسار ${to}`);
      return { to, icon, label: meta.title };
    }),
  // رابط معاينة بوابة المستفيد — مسجَّل في BENEFICIARY_ROUTES لكنه يظهر للناظر كمعاينة
  { to: '/beneficiary', icon: Eye, label: 'معاينة بوابة المستفيد' },
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
  { to: '/beneficiary/expenses', icon: TrendingDown, label: 'المصروفات' },
  { to: '/beneficiary/bylaws', icon: BookOpen, label: 'اللائحة التنظيمية' },
  { to: '/beneficiary/archive', icon: FolderArchive, label: 'أرشيف الوثائق' },
  { to: '/beneficiary/support', icon: Headset, label: 'الدعم الفني' },
  { to: '/beneficiary/annual-report', icon: ClipboardList, label: 'التقرير السنوي للوقف' },
  { to: '/beneficiary/settings', icon: Settings, label: 'الإعدادات' },
];

// ─── Sidebar grouping (PR-1) ───
// Single source of truth for which menu group a route belongs to.
// Routes not listed appear ungrouped (above all groups for admin, below for beneficiary).
export const ADMIN_GROUP_ORDER = ['operations', 'finance', 'reference', 'communication', 'administration', 'system'] as const;
export type AdminGroupKey = typeof ADMIN_GROUP_ORDER[number];

export const ADMIN_GROUP_LABELS: Record<AdminGroupKey, string> = {
  operations: 'التشغيل',
  finance: 'المالية والتقارير',
  reference: 'المرجع',
  communication: 'الاتصال',
  administration: 'الإدارة',
  system: 'النظام والتكاملات',
};

export const ADMIN_ROUTE_GROUPS: Record<string, AdminGroupKey> = {
  '/dashboard/properties': 'operations',
  '/dashboard/contracts': 'operations',
  '/dashboard/beneficiaries': 'operations',
  '/dashboard/income': 'finance',
  '/dashboard/expenses': 'finance',
  '/dashboard/invoices': 'finance',
  '/dashboard/accounts': 'finance',
  '/dashboard/distributions': 'finance',
  '/dashboard/reports': 'finance',
  '/dashboard/chart-of-accounts': 'finance',
  '/dashboard/comparison': 'finance',
  // P1/C2: نُقل التقرير السنوي من `reference` إلى `finance` لأنه وثيقة مالية بالكامل
  '/dashboard/annual-report': 'finance',
  '/dashboard/bylaws': 'reference',
  '/dashboard/archive': 'reference',
  '/dashboard/messages': 'communication',
  '/dashboard/support': 'communication',
  '/dashboard/users': 'administration',
  '/dashboard/settings': 'administration',
  '/dashboard/audit-log': 'system',
  '/dashboard/zatca': 'system',
  '/dashboard/email-monitor': 'system',
  '/dashboard/diagnostics': 'system',
  // P1/C3: audit-report-final + cleanup-report خرجا من القائمة الجانبية
  // ويُوصل إليهما الآن عبر أزرار داخل /dashboard/audit-log
  // P2/C1+A3: دُمجت مجموعة `preview` ذات العنصر الواحد ضمن `administration` لإلغاء الخط الفاصل الزائد
  '/beneficiary': 'administration',
};

export const BENEFICIARY_GROUP_ORDER = ['financial', 'documents', 'communication', 'account'] as const;
export type BeneficiaryGroupKey = typeof BENEFICIARY_GROUP_ORDER[number];

export const BENEFICIARY_GROUP_LABELS: Record<BeneficiaryGroupKey, string> = {
  financial: 'المالية',
  documents: 'المستندات',
  communication: 'الاتصال',
  account: 'حسابي',
};

export const BENEFICIARY_ROUTE_GROUPS: Record<string, BeneficiaryGroupKey> = {
  '/beneficiary/properties': 'documents',
  '/beneficiary/contracts': 'documents',
  '/beneficiary/invoices': 'documents',
  '/beneficiary/bylaws': 'documents',
  '/beneficiary/archive': 'documents',
  '/beneficiary/annual-report': 'documents',
  '/beneficiary/disclosure': 'financial',
  '/beneficiary/my-share': 'financial',
  '/beneficiary/carryforward': 'financial',
  '/beneficiary/financial-reports': 'financial',
  '/beneficiary/accounts': 'financial',
  '/beneficiary/expenses': 'financial',
  '/beneficiary/messages': 'communication',
  '/beneficiary/notifications': 'communication',
  '/beneficiary/support': 'communication',
  '/beneficiary/settings': 'account',
};

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
// P1: audit-report-final + cleanup-report لم يعودا في `allAdminLinks`، فلا حاجة لإدراجهما هنا.
// نُبقي الباقي كطبقة حماية بجانب defaults الصلاحيات (P0/A2).
export const ACCOUNTANT_EXCLUDED_ROUTES = ['/dashboard/users', '/dashboard/settings', '/dashboard/zatca', '/dashboard/diagnostics', '/dashboard/email-monitor', '/dashboard/comparison', '/beneficiary'];

// ─── Section visibility defaults (مشتقة من sections.ts — مصدر واحد للحقيقة #16/#17) ───
export const defaultAdminSections: Record<string, boolean> = makeDefaults(ADMIN_SECTION_KEYS);
export const defaultBeneficiarySections: Record<string, boolean> = makeDefaults(BENEFICIARY_SECTION_KEYS);

/** خريطة من المسار إلى مفتاح القسم — للوحة الناظر/المحاسب (مبنية من السجل) */
export const ADMIN_ROUTE_TO_SECTION: Record<string, string> = buildSectionKeys(ADMIN_ROUTES);

/** خريطة من المسار إلى مفتاح القسم — لواجهة المستفيد/الواقف (مبنية من السجل) */
export const BENEFICIARY_ROUTE_TO_SECTION: Record<string, string> = buildSectionKeys(BENEFICIARY_ROUTES);

// ─── Dynamic mobile header titles (مبنية من السجل الموحّد) ───
export const ROUTE_TITLES: Record<string, string> = buildTitles(ALL_ROUTES);
