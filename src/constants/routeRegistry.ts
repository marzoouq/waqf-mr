/**
 * سجل المسارات الموحّد (Route Registry) — #23/#69
 * ────────────────────────────────────────────────
 * مصدر واحد للحقيقة لكل بيانات المسار (label key, title, permission key, section key).
 * يحلّ محل التكرار بين 4 maps منفصلة في `navigation.ts`، ويُسهّل إضافة مسار جديد
 * عبر إدخال واحد بدلاً من تعديل 4 ملفات.
 *
 * `navigation.ts` يبني الـ maps القديمة (`linkLabelKeys`, `ROUTE_TITLES`,
 * `ADMIN_ROUTE_PERM_KEYS`, ...) من هذا السجل ليبقى التوافق العكسي مكتملاً.
 */
import type { MenuLabels } from '@/types/navigation';

export interface RouteMeta {
  /** عنوان المسار في واجهة المستخدم (Mobile header / breadcrumbs) */
  title: string;
  /** مفتاح في `MenuLabels` للترجمة الديناميكية */
  labelKey?: keyof MenuLabels;
  /** مفتاح الصلاحية في `permissions.routes` (إن وجد) */
  permKey?: string;
  /** مفتاح القسم في `sections` لتحكم الناظر بالظهور */
  sectionKey?: string;
}

/** مسارات لوحة الناظر/المحاسب */
export const ADMIN_ROUTES: Record<string, RouteMeta> = {
  '/dashboard': { title: 'الرئيسية', labelKey: 'home' },
  '/dashboard/properties': { title: 'العقارات', labelKey: 'properties', permKey: 'properties', sectionKey: 'properties' },
  '/dashboard/contracts': { title: 'العقود', labelKey: 'contracts', permKey: 'contracts', sectionKey: 'contracts' },
  '/dashboard/income': { title: 'الدخل', labelKey: 'income', permKey: 'income', sectionKey: 'income' },
  '/dashboard/expenses': { title: 'المصروفات', labelKey: 'expenses', permKey: 'expenses', sectionKey: 'expenses' },
  '/dashboard/beneficiaries': { title: 'المستفيدين', labelKey: 'beneficiaries', permKey: 'beneficiaries', sectionKey: 'beneficiaries' },
  '/dashboard/reports': { title: 'التقارير', labelKey: 'reports', permKey: 'reports', sectionKey: 'reports' },
  '/dashboard/accounts': { title: 'الحسابات', labelKey: 'accounts', permKey: 'accounts', sectionKey: 'accounts' },
  '/dashboard/users': { title: 'إدارة المستخدمين', labelKey: 'users', sectionKey: 'users' },
  '/dashboard/settings': { title: 'الإعدادات', labelKey: 'settings' },
  '/dashboard/messages': { title: 'المراسلات', labelKey: 'messages', permKey: 'messages', sectionKey: 'messages' },
  '/dashboard/invoices': { title: 'الفواتير', labelKey: 'invoices', permKey: 'invoices', sectionKey: 'invoices' },
  '/dashboard/audit-log': { title: 'سجل المراجعة', labelKey: 'audit_log', permKey: 'audit_log', sectionKey: 'audit_log' },
  '/dashboard/bylaws': { title: 'اللائحة التنظيمية', labelKey: 'bylaws', permKey: 'bylaws', sectionKey: 'bylaws' },
  '/dashboard/zatca': { title: 'إدارة ZATCA', labelKey: 'zatca' },
  '/dashboard/annual-report': { title: 'التقرير السنوي', labelKey: 'annual_report', permKey: 'annual_report', sectionKey: 'annual_report' },
  '/dashboard/support': { title: 'الدعم الفني', labelKey: 'support', permKey: 'support', sectionKey: 'support' },
  '/dashboard/chart-of-accounts': { title: 'الشجرة المحاسبية', labelKey: 'chart_of_accounts', permKey: 'chart_of_accounts', sectionKey: 'chart_of_accounts' },
  '/dashboard/comparison': { title: 'المقارنة التاريخية', labelKey: 'comparison' },
  '/dashboard/diagnostics': { title: 'تشخيص النظام', labelKey: 'diagnostics' },
  '/dashboard/email-monitor': { title: 'مراقبة البريد', labelKey: 'email_monitor' },
};

/**
 * مسارات واجهة المستفيد/الواقف
 *
 * #24 من تقرير الفحص العميق: تم فصل `/beneficiary/carryforward` بمفتاح `carryforward`
 * صريح بدل خلطه مع `share`. سياسات الصلاحيات لا تزال قد تعامل القسمين معاً، لكن
 * المفاتيح الآن مستقلة لتسهيل التحكم المستقبلي.
 */
export const BENEFICIARY_ROUTES: Record<string, RouteMeta> = {
  '/beneficiary': { title: 'الرئيسية', labelKey: 'beneficiary_view' },
  '/beneficiary/properties': { title: 'العقارات', permKey: 'properties', sectionKey: 'properties' },
  '/beneficiary/contracts': { title: 'العقود', permKey: 'contracts', sectionKey: 'contracts' },
  '/beneficiary/disclosure': { title: 'الإفصاح السنوي', permKey: 'disclosure', sectionKey: 'disclosure' },
  '/beneficiary/my-share': { title: 'حصتي من الريع', permKey: 'share', sectionKey: 'share' },
  '/beneficiary/carryforward': { title: 'الترحيلات والخصومات', permKey: 'carryforward', sectionKey: 'carryforward' },
  '/beneficiary/financial-reports': { title: 'التقارير المالية', permKey: 'reports', sectionKey: 'reports' },
  '/beneficiary/accounts': { title: 'الحسابات الختامية', permKey: 'accounts', sectionKey: 'accounts' },
  '/beneficiary/messages': { title: 'المراسلات', permKey: 'messages', sectionKey: 'messages' },
  '/beneficiary/notifications': { title: 'سجل الإشعارات', permKey: 'notifications', sectionKey: 'notifications' },
  '/beneficiary/invoices': { title: 'الفواتير', permKey: 'invoices', sectionKey: 'invoices' },
  '/beneficiary/bylaws': { title: 'اللائحة التنظيمية', permKey: 'bylaws', sectionKey: 'bylaws' },
  '/beneficiary/settings': { title: 'الإعدادات' },
  '/beneficiary/support': { title: 'الدعم الفني', permKey: 'support', sectionKey: 'support' },
  '/beneficiary/annual-report': { title: 'التقرير السنوي', permKey: 'annual_report', sectionKey: 'annual_report' },
  '/waqif': { title: 'لوحة الواقف' },
};

/** كل المسارات المعروفة (للوصول السريع لـ `title`) */
export const ALL_ROUTES: Record<string, RouteMeta> = {
  ...ADMIN_ROUTES,
  ...BENEFICIARY_ROUTES,
};

// ─── Helpers لبناء maps قديمة من السجل ───
function pickMap<K extends keyof RouteMeta>(
  source: Record<string, RouteMeta>,
  field: K,
): Record<string, NonNullable<RouteMeta[K]>> {
  const out: Record<string, NonNullable<RouteMeta[K]>> = {};
  for (const [route, meta] of Object.entries(source)) {
    const value = meta[field];
    if (value !== undefined) out[route] = value as NonNullable<RouteMeta[K]>;
  }
  return out;
}

export const buildLabelKeys = (source: Record<string, RouteMeta>) => pickMap(source, 'labelKey');
export const buildPermKeys = (source: Record<string, RouteMeta>) => pickMap(source, 'permKey');
export const buildSectionKeys = (source: Record<string, RouteMeta>) => pickMap(source, 'sectionKey');
export const buildTitles = (source: Record<string, RouteMeta>) => pickMap(source, 'title');
