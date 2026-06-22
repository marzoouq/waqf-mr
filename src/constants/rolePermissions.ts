/**
 * Default role permissions — single source of truth.
 * Used by DashboardLayout (menu filtering) and RolePermissionsTab (admin UI).
 */
export type RolePerms = Record<string, Record<string, boolean>>;

export const DEFAULT_ROLE_PERMS: RolePerms = {
  accountant: {
    properties: true, contracts: true, income: true, expenses: true,
    beneficiaries: true, reports: true, accounts: true, invoices: true,
    bylaws: true, messages: true, audit_log: true, annual_report: true,
    support: true, chart_of_accounts: true,
    // P0/A1: مفتاح مستقل لتوزيع الحصص (كان مقترناً بـ`accounts`)
    distributions: true,
    // P0/A2: مسارات إدارية محظورة افتراضياً على المحاسب (Fail-Closed)
    // الأمن يعتمد الآن على مفاتيح صلاحيات صريحة بدلاً من ACCOUNTANT_EXCLUDED_ROUTES فقط
    users: false, settings: false, zatca: false, comparison: false,
    diagnostics: false, email_monitor: false,
    audit_report_final: false, cleanup_report: false,
  },
  // P0: استبدلنا مفتاح `reports` legacy بمفاتيح متطابقة مع routeRegistry:
  // `financial_reports` و`carryforward` (انظر BENEFICIARY_ROUTES.permKey)
  beneficiary: {
    properties: true, contracts: true, disclosure: true, share: true,
    carryforward: true, financial_reports: true,
    accounts: true, invoices: true, expenses: true, bylaws: true, messages: true,
    notifications: true, annual_report: true, support: true,
  },
  waqif: {
    properties: true, contracts: true, disclosure: false,
    financial_reports: true, accounts: true, invoices: true,
    expenses: true, bylaws: true,
    share: false, notifications: true, annual_report: true,
    support: true,
  },
};
