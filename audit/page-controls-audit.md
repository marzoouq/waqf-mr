# Page Controls Audit — Admin & Beneficiary

Generated: 2026-06-23T21:43:17.756Z

## Scope

- Pages scanned: **43** under `src/pages/dashboard` + `src/pages/beneficiary`.
- First-level child components recursed: **33** under `@/components/dashboard/`, `@/components/beneficiary/`, `@/components/shared/`, `@/components/admin/`.
- Control types: Tab, Button, IconButton, DropdownItem, CommandItem, MenuItem, Link, FormSubmit.
- Method: regex inventory (not full AST). A control is **OK** if it has `onClick` / `onSubmit` / `asChild` / `type=submit` / `to=` / `href=` / parent Trigger / Radix TabsTrigger.

## Totals

| Metric | Value |
|---|---|
| Page-level controls | 94 |
| Child-component controls | 25 |
| Total controls | 119 |
| OK | 119 |
| GAP-NO-HANDLER | 0 |

## Per-page summary (page + recursed children)

| Page | Route | Roles | Children | Tabs | Buttons | Dropdown/CommandItems | Links | Forms | Gaps |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| `beneficiary/AccountsViewPage.tsx` | `/beneficiary/accounts` | ALL_NON_ACCOUNTANT | 1 | 0 | 1 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/AnnualReportViewPage.tsx` | `/beneficiary/annual-report` | ALL_NON_ACCOUNTANT | 0 | 4 | 3 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/ArchiveViewPage.tsx` | `/beneficiary/archive` | ALL_NON_ACCOUNTANT | 0 | 0 | 0 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/BeneficiaryDashboard.tsx` | `/beneficiary` | BENEFICIARY_ROLES | 6 | 0 | 2 | 0 | 2 | 0 | ✅ 0 |
| `beneficiary/BeneficiaryMessagesPage.tsx` | `/beneficiary/messages` | BENEFICIARY_ROLES | 0 | 0 | 2 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/BeneficiarySettingsPage.tsx` | `/beneficiary/settings` | ALL_NON_ACCOUNTANT | 0 | 0 | 0 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/BylawsViewPage.tsx` | `/beneficiary/bylaws` | ALL_NON_ACCOUNTANT | 0 | 0 | 1 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/CarryforwardHistoryPage.tsx` | `/beneficiary/carryforward` | BENEFICIARY_ROLES | 1 | 0 | 1 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/ContractsViewPage.tsx` | `/beneficiary/contracts` | ALL_NON_ACCOUNTANT | 0 | 0 | 0 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/DisclosurePage.tsx` | `/beneficiary/disclosure` | BENEFICIARY_ROLES | 3 | 0 | 1 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/ExpensesViewPage.tsx` | `/beneficiary/expenses` | ALL_NON_ACCOUNTANT | 0 | 0 | 0 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/FinancialReportsPage.tsx` | `/beneficiary/financial-reports` | ALL_NON_ACCOUNTANT | 0 | 0 | 0 | 0 | 1 | 0 | ✅ 0 |
| `beneficiary/InvoicesViewPage.tsx` | `/beneficiary/invoices` | ALL_NON_ACCOUNTANT | 0 | 3 | 2 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/MySharePage.tsx` | `/beneficiary/my-share` | BENEFICIARY_ROLES | 6 | 0 | 4 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/NotificationsPage.tsx` | `/beneficiary/notifications` | BENEFICIARY_ROLES | 0 | 0 | 1 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/PropertiesViewPage.tsx` | `/beneficiary/properties` | ALL_NON_ACCOUNTANT | 1 | 0 | 1 | 0 | 2 | 0 | ✅ 0 |
| `beneficiary/SupportPage.tsx` | `(no route)` | (n/a) | 0 | 0 | 2 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/SupportPageGuard.tsx` | `/beneficiary/support` | BENEFICIARY_ROLES | 0 | 0 | 0 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/AccountsPage.tsx` | `/dashboard/accounts` | ADMIN_ROLES | 0 | 0 | 4 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/AdminDashboard.tsx` | `/dashboard` | ADMIN_ROLES | 10 | 0 | 10 | 0 | 9 | 0 | ✅ 0 |
| `dashboard/AnnualReportPage.tsx` | `/dashboard/annual-report` | ADMIN_ROLES | 0 | 4 | 3 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/ArchivePage.tsx` | `/dashboard/archive` | ADMIN_ROLES | 0 | 0 | 1 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/AuditLogPage.tsx` | `/dashboard/audit-log` | ADMIN_ROLES | 0 | 3 | 3 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/AuditReportFinalPage.tsx` | `/dashboard/audit-report-final` | ADMIN_ONLY | 2 | 0 | 2 | 0 | 1 | 0 | ✅ 0 |
| `dashboard/BeneficiariesPage.tsx` | `/dashboard/beneficiaries` | ADMIN_ROLES | 0 | 2 | 0 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/BylawsPage.tsx` | `/dashboard/bylaws` | ADMIN_ROLES | 0 | 0 | 1 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/ChartOfAccountsPage.tsx` | `/dashboard/chart-of-accounts` | ADMIN_ROLES | 0 | 0 | 5 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/CleanupReportPage.tsx` | `/dashboard/cleanup-report` | ADMIN_ONLY | 2 | 0 | 1 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/ContractsPage.tsx` | `/dashboard/contracts` | ADMIN_ROLES | 0 | 2 | 1 | 0 | 2 | 0 | ✅ 0 |
| `dashboard/DistributionsPage.tsx` | `/dashboard/distributions` | ADMIN_ROLES | 0 | 0 | 1 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/EmailMonitorPage.tsx` | `/dashboard/email-monitor` | ADMIN_ONLY | 0 | 0 | 1 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/ExpensesPage.tsx` | `/dashboard/expenses` | ADMIN_ROLES | 1 | 0 | 1 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/HistoricalComparisonPage.tsx` | `/dashboard/comparison` | ADMIN_ONLY | 0 | 0 | 2 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/IncomePage.tsx` | `/dashboard/income` | ADMIN_ROLES | 0 | 0 | 0 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/InvoicesPage.tsx` | `/dashboard/invoices` | ADMIN_ROLES | 0 | 3 | 5 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/MessagesPage.tsx` | `/dashboard/messages` | ADMIN_ROLES | 0 | 0 | 1 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/PropertiesPage.tsx` | `/dashboard/properties` | ADMIN_ROLES | 0 | 0 | 0 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/ReportsPage.tsx` | `/dashboard/reports` | ADMIN_ROLES | 0 | 0 | 3 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/SettingsPage.tsx` | `/dashboard/settings` | ADMIN_ONLY | 0 | 1 | 0 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/SupportDashboardPage.tsx` | `/dashboard/support` | ADMIN_ROLES | 0 | 3 | 1 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/SystemDiagnosticsPage.tsx` | `/dashboard/diagnostics` | ADMIN_ONLY | 0 | 7 | 0 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/UserManagementPage.tsx` | `/dashboard/users` | ADMIN_ONLY | 0 | 0 | 0 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/ZatcaManagementPage.tsx` | `/dashboard/zatca` | ADMIN_ONLY | 0 | 3 | 0 | 0 | 0 | 0 | ✅ 0 |

## Gaps

✅ No controls without a handler detected on admin/beneficiary pages or their first-level child components.
