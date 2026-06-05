# Page Controls Audit — Admin & Beneficiary

Generated: 2026-06-05T22:29:28.510Z

## Scope

- Pages scanned: **39** under `src/pages/dashboard` + `src/pages/beneficiary`.
- Control types: Tab, Button, IconButton, DropdownItem, CommandItem, MenuItem, Link, FormSubmit (top-level only — children components are not recursively scanned in this phase).
- Method: regex inventory (not full AST). A control is **OK** if it has `onClick` / `onSubmit` / `asChild` / `type=submit` / `to=` / `href=` / parent Trigger.

## Totals

| Metric | Value |
|---|---|
| Total controls | 91 |
| OK | 63 |
| GAP-NO-HANDLER | 28 |

## Per-page summary

| Page | Route | Roles | Tabs | Buttons | Dropdown/CommandItems | Links | Forms | Gaps |
|---|---|---|---:|---:|---:|---:|---:|---:|
| `beneficiary/AccountsViewPage.tsx` | `/beneficiary/accounts` | ALL_NON_ACCOUNTANT | 0 | 3 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/AnnualReportViewPage.tsx` | `/beneficiary/annual-report` | ALL_NON_ACCOUNTANT | 4 | 3 | 0 | 0 | 0 | 🔴 4 |
| `beneficiary/BeneficiaryDashboard.tsx` | `/beneficiary` | BENEFICIARY_ROLES | 0 | 0 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/BeneficiaryMessagesPage.tsx` | `/beneficiary/messages` | BENEFICIARY_ROLES | 0 | 3 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/BeneficiarySettingsPage.tsx` | `/beneficiary/settings` | ALL_NON_ACCOUNTANT | 0 | 0 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/BylawsViewPage.tsx` | `/beneficiary/bylaws` | ALL_NON_ACCOUNTANT | 0 | 1 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/CarryforwardHistoryPage.tsx` | `/beneficiary/carryforward` | BENEFICIARY_ROLES | 0 | 2 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/ContractsViewPage.tsx` | `/beneficiary/contracts` | ALL_NON_ACCOUNTANT | 0 | 1 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/DisclosurePage.tsx` | `/beneficiary/disclosure` | BENEFICIARY_ROLES | 0 | 1 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/ExpensesViewPage.tsx` | `/beneficiary/expenses` | ALL_NON_ACCOUNTANT | 0 | 0 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/FinancialReportsPage.tsx` | `/beneficiary/financial-reports` | ALL_NON_ACCOUNTANT | 0 | 1 | 0 | 1 | 0 | ✅ 0 |
| `beneficiary/InvoicesViewPage.tsx` | `/beneficiary/invoices` | ALL_NON_ACCOUNTANT | 3 | 3 | 0 | 0 | 0 | 🔴 3 |
| `beneficiary/MySharePage.tsx` | `/beneficiary/my-share` | BENEFICIARY_ROLES | 0 | 1 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/NotificationsPage.tsx` | `/beneficiary/notifications` | BENEFICIARY_ROLES | 0 | 2 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/PropertiesViewPage.tsx` | `/beneficiary/properties` | ALL_NON_ACCOUNTANT | 0 | 1 | 0 | 2 | 0 | ✅ 0 |
| `beneficiary/SupportPage.tsx` | `(no route)` | (n/a) | 0 | 2 | 0 | 0 | 0 | ✅ 0 |
| `beneficiary/SupportPageGuard.tsx` | `/beneficiary/support` | BENEFICIARY_ROLES | 0 | 0 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/AccountsPage.tsx` | `/dashboard/accounts` | ADMIN_ROLES | 0 | 4 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/AdminDashboard.tsx` | `/dashboard` | ADMIN_ROLES | 0 | 2 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/AnnualReportPage.tsx` | `/dashboard/annual-report` | ADMIN_ROLES | 4 | 3 | 0 | 0 | 0 | 🔴 4 |
| `dashboard/AuditLogPage.tsx` | `/dashboard/audit-log` | ADMIN_ROLES | 3 | 1 | 0 | 0 | 0 | 🔴 3 |
| `dashboard/BeneficiariesPage.tsx` | `/dashboard/beneficiaries` | ADMIN_ROLES | 2 | 0 | 0 | 0 | 0 | 🔴 2 |
| `dashboard/BylawsPage.tsx` | `/dashboard/bylaws` | ADMIN_ROLES | 0 | 1 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/ChartOfAccountsPage.tsx` | `/dashboard/chart-of-accounts` | ADMIN_ROLES | 0 | 5 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/ContractsPage.tsx` | `/dashboard/contracts` | ADMIN_ROLES | 2 | 1 | 0 | 2 | 0 | 🔴 2 |
| `dashboard/DistributionsPage.tsx` | `/dashboard/distributions` | ADMIN_ROLES | 0 | 1 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/EmailMonitorPage.tsx` | `/dashboard/email-monitor` | ADMIN_ONLY | 0 | 1 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/ExpensesPage.tsx` | `/dashboard/expenses` | ADMIN_ROLES | 0 | 0 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/HistoricalComparisonPage.tsx` | `/dashboard/comparison` | ADMIN_ONLY | 0 | 2 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/IncomePage.tsx` | `/dashboard/income` | ADMIN_ROLES | 0 | 0 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/InvoicesPage.tsx` | `/dashboard/invoices` | ADMIN_ROLES | 3 | 5 | 0 | 0 | 0 | 🔴 3 |
| `dashboard/MessagesPage.tsx` | `/dashboard/messages` | ADMIN_ROLES | 0 | 1 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/PropertiesPage.tsx` | `/dashboard/properties` | ADMIN_ROLES | 0 | 0 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/ReportsPage.tsx` | `/dashboard/reports` | ADMIN_ROLES | 0 | 3 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/SettingsPage.tsx` | `/dashboard/settings` | ADMIN_ONLY | 1 | 0 | 0 | 0 | 0 | 🔴 1 |
| `dashboard/SupportDashboardPage.tsx` | `/dashboard/support` | ADMIN_ROLES | 3 | 1 | 0 | 0 | 0 | 🔴 3 |
| `dashboard/SystemDiagnosticsPage.tsx` | `/dashboard/diagnostics` | ADMIN_ONLY | 0 | 3 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/UserManagementPage.tsx` | `/dashboard/users` | ADMIN_ONLY | 0 | 0 | 0 | 0 | 0 | ✅ 0 |
| `dashboard/ZatcaManagementPage.tsx` | `/dashboard/zatca` | ADMIN_ONLY | 3 | 0 | 0 | 0 | 0 | 🔴 3 |

## Gaps (controls without handler)

| file:line | type | label | parents |
|---|---|---|---|
| `src/pages/dashboard/AnnualReportPage.tsx:110` | Tab | حالة العقارات | `Loader2>Tabs>TabsList` |
| `src/pages/dashboard/AnnualReportPage.tsx:115` | Tab | الإنجازات | `TabsList>Building2` |
| `src/pages/dashboard/AnnualReportPage.tsx:120` | Tab | التحديات | `TabsList>Building2>Trophy` |
| `src/pages/dashboard/AnnualReportPage.tsx:125` | Tab | الخطط المستقبلية | `Building2>Trophy>AlertTriangle` |
| `src/pages/dashboard/AuditLogPage.tsx:47` | Tab | سجل العمليات | `Tabs>SelectValue>TabsList` |
| `src/pages/dashboard/AuditLogPage.tsx:48` | Tab | محاولات الوصول | `SelectValue>TabsList>Activity` |
| `src/pages/dashboard/AuditLogPage.tsx:49` | Tab | الأرشيف | `TabsList>Activity>ShieldAlert` |
| `src/pages/dashboard/BeneficiariesPage.tsx:34` | Tab | المستفيدون | `BeneficiaryFormDialog>Tabs>TabsList` |
| `src/pages/dashboard/BeneficiariesPage.tsx:35` | Tab | طلبات السُلف | `BeneficiaryFormDialog>Tabs>TabsList` |
| `src/pages/dashboard/ContractsPage.tsx:52` | Tab | العقود | `Tabs>NativeSelect>TabsList` |
| `src/pages/dashboard/ContractsPage.tsx:53` | Tab | الاستحقاقات | `NativeSelect>TabsList>FileText` |
| `src/pages/dashboard/InvoicesPage.tsx:59` | Tab | الكل () | `InvoiceSummaryCards>Tabs>TabsList` |
| `src/pages/dashboard/InvoicesPage.tsx:60` | Tab | فواتير الإيجار | `InvoiceSummaryCards>Tabs>TabsList` |
| `src/pages/dashboard/InvoicesPage.tsx:61` | Tab | فواتير الشراء | `InvoiceSummaryCards>Tabs>TabsList` |
| `src/pages/dashboard/SettingsPage.tsx:65` | Tab | _(empty)_ | `SelectValue>TabsList` |
| `src/pages/dashboard/SupportDashboardPage.tsx:50` | Tab | التذاكر | `SupportStatsCards>Tabs>TabsList` |
| `src/pages/dashboard/SupportDashboardPage.tsx:51` | Tab | الأخطاء | `Tabs>TabsList>Headset` |
| `src/pages/dashboard/SupportDashboardPage.tsx:52` | Tab | الإحصائيات | `TabsList>Headset>Bug` |
| `src/pages/dashboard/ZatcaManagementPage.tsx:72` | Tab | الفواتير | `ZatcaHealthPanel>Tabs>TabsList` |
| `src/pages/dashboard/ZatcaManagementPage.tsx:73` | Tab | الشهادات | `Tabs>TabsList>FileText` |
| `src/pages/dashboard/ZatcaManagementPage.tsx:74` | Tab | سلسلة التوقيع | `TabsList>FileText>ShieldCheck` |
| `src/pages/beneficiary/AnnualReportViewPage.tsx:113` | Tab | حالة العقارات | `IncomeComparisonChart>Tabs>TabsList` |
| `src/pages/beneficiary/AnnualReportViewPage.tsx:116` | Tab | الإنجازات | `Tabs>TabsList>Building2` |
| `src/pages/beneficiary/AnnualReportViewPage.tsx:119` | Tab | التحديات | `TabsList>Building2>Trophy` |
| `src/pages/beneficiary/AnnualReportViewPage.tsx:122` | Tab | الخطط المستقبلية | `Building2>Trophy>AlertTriangle` |
| `src/pages/beneficiary/InvoicesViewPage.tsx:70` | Tab | الكل | `LayoutGrid>Tabs>TabsList` |
| `src/pages/beneficiary/InvoicesViewPage.tsx:71` | Tab | فواتير الإيجار | `LayoutGrid>Tabs>TabsList` |
| `src/pages/beneficiary/InvoicesViewPage.tsx:72` | Tab | فواتير الشراء | `LayoutGrid>Tabs>TabsList` |
