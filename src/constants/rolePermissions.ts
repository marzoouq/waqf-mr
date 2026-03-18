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
    support: true,
  },
  beneficiary: {
    properties: true, contracts: true, disclosure: true, share: true,
    reports: true, accounts: true, invoices: true, bylaws: true, messages: true,
    notifications: true, annual_report: true, support: true,
  },
  waqif: {
    properties: true, contracts: true, disclosure: false,
    reports: true, accounts: true, bylaws: true,
    share: false, notifications: true, annual_report: true,
    support: false,
  },
};
