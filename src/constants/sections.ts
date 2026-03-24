/**
 * ثوابت الأقسام المركزية — مصدر واحد للحقيقة
 * تُستخدم في: SectionsTab, BeneficiaryTab, RolePermissionsTab, DashboardLayout
 */

/** أسماء جميع الأقسام بالعربية */
export const SECTION_LABELS: Record<string, string> = {
  properties: 'العقارات',
  contracts: 'العقود',
  income: 'الدخل',
  expenses: 'المصروفات',
  beneficiaries: 'المستفيدين',
  reports: 'التقارير',
  accounts: 'الحسابات',
  users: 'إدارة المستخدمين',
  invoices: 'الفواتير',
  bylaws: 'اللائحة التنظيمية',
  messages: 'المراسلات',
  audit_log: 'سجل المراجعة',
  annual_report: 'التقرير السنوي',
  support: 'الدعم الفني',
  chart_of_accounts: 'الشجرة المحاسبية',
  disclosure: 'الإفصاح السنوي',
  share: 'حصتي من الريع',
  notifications: 'سجل الإشعارات',
};

/** مفاتيح أقسام لوحة تحكم الناظر/المحاسب */
export const ADMIN_SECTION_KEYS = [
  'properties', 'contracts', 'income', 'expenses', 'beneficiaries',
  'reports', 'accounts', 'users', 'invoices', 'bylaws', 'messages',
  'audit_log', 'annual_report', 'support', 'chart_of_accounts',
] as const;

/** مفاتيح أقسام واجهة المستفيد */
export const BENEFICIARY_SECTION_KEYS = [
  'properties', 'contracts', 'disclosure', 'share', 'accounts',
  'reports', 'invoices', 'bylaws', 'messages', 'notifications',
  'annual_report', 'support',
] as const;

/** تعريف الأقسام مع الأدوار المؤهلة لمصفوفة الصلاحيات */
export const ROLE_SECTION_DEFS: { key: string; label: string; roles: string[] }[] = [
  { key: 'properties', label: SECTION_LABELS['properties'] ?? '', roles: ['accountant', 'beneficiary', 'waqif'] },
  { key: 'contracts', label: SECTION_LABELS['contracts'] ?? '', roles: ['accountant', 'beneficiary', 'waqif'] },
  { key: 'income', label: SECTION_LABELS['income'] ?? '', roles: ['accountant'] },
  { key: 'expenses', label: SECTION_LABELS['expenses'] ?? '', roles: ['accountant'] },
  { key: 'beneficiaries', label: SECTION_LABELS['beneficiaries'] ?? '', roles: ['accountant'] },
  { key: 'reports', label: SECTION_LABELS['reports'] ?? '', roles: ['accountant', 'beneficiary', 'waqif'] },
  { key: 'accounts', label: SECTION_LABELS['accounts'] ?? '', roles: ['accountant', 'beneficiary', 'waqif'] },
  { key: 'invoices', label: SECTION_LABELS['invoices'] ?? '', roles: ['accountant', 'beneficiary'] },
  { key: 'bylaws', label: SECTION_LABELS['bylaws'] ?? '', roles: ['accountant', 'beneficiary', 'waqif'] },
  { key: 'disclosure', label: SECTION_LABELS['disclosure'] ?? '', roles: ['beneficiary'] },
  { key: 'share', label: SECTION_LABELS['share'] ?? '', roles: ['beneficiary'] },
  { key: 'messages', label: SECTION_LABELS['messages'] ?? '', roles: ['accountant', 'beneficiary'] },
  { key: 'audit_log', label: SECTION_LABELS['audit_log'] ?? '', roles: ['accountant'] },
  { key: 'notifications', label: SECTION_LABELS['notifications'] ?? '', roles: ['beneficiary', 'waqif'] },
  { key: 'annual_report', label: SECTION_LABELS['annual_report'] ?? '', roles: ['accountant', 'beneficiary', 'waqif'] },
  { key: 'support', label: SECTION_LABELS['support'] ?? '', roles: ['accountant', 'beneficiary', 'waqif'] },
];

/** إنشاء قاموس labels مفلتر حسب مفاتيح محددة */
export const pickLabels = (keys: readonly string[]): Record<string, string> =>
  Object.fromEntries(keys.map(k => [k, SECTION_LABELS[k] ?? k]));

/** إنشاء defaults (كلها true) من مفاتيح */
export const makeDefaults = (keys: readonly string[]): Record<string, boolean> =>
  Object.fromEntries(keys.map(k => [k, true]));
