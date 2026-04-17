import { Route } from "react-router-dom";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { pr } from "./protectedRoute";

const AdminDashboard = lazyWithRetry(() => import("@/pages/dashboard/AdminDashboard"));
const PropertiesPage = lazyWithRetry(() => import("@/pages/dashboard/PropertiesPage"));
const ContractsPage = lazyWithRetry(() => import("@/pages/dashboard/ContractsPage"));
const IncomePage = lazyWithRetry(() => import("@/pages/dashboard/IncomePage"));
const ExpensesPage = lazyWithRetry(() => import("@/pages/dashboard/ExpensesPage"));
const BeneficiariesPage = lazyWithRetry(() => import("@/pages/dashboard/BeneficiariesPage"));
const ReportsPage = lazyWithRetry(() => import("@/pages/dashboard/ReportsPage"));
const AccountsPage = lazyWithRetry(() => import("@/pages/dashboard/AccountsPage"));
const UserManagementPage = lazyWithRetry(() => import("@/pages/dashboard/UserManagementPage"));
const SettingsPage = lazyWithRetry(() => import("@/pages/dashboard/SettingsPage"));
const MessagesPage = lazyWithRetry(() => import("@/pages/dashboard/MessagesPage"));
const InvoicesPage = lazyWithRetry(() => import("@/pages/dashboard/InvoicesPage"));
const AuditLogPage = lazyWithRetry(() => import("@/pages/dashboard/AuditLogPage"));
const BylawsPage = lazyWithRetry(() => import("@/pages/dashboard/BylawsPage"));
const ZatcaManagementPage = lazyWithRetry(() => import("@/pages/dashboard/ZatcaManagementPage"));
const SupportDashboardPage = lazyWithRetry(() => import("@/pages/dashboard/SupportDashboardPage"));
const AnnualReportPage = lazyWithRetry(() => import("@/pages/dashboard/AnnualReportPage"));
const ChartOfAccountsPage = lazyWithRetry(() => import("@/pages/dashboard/ChartOfAccountsPage"));
const HistoricalComparisonPage = lazyWithRetry(() => import("@/pages/dashboard/HistoricalComparisonPage"));
const SystemDiagnosticsPage = lazyWithRetry(() => import("@/pages/dashboard/SystemDiagnosticsPage"));

import { ADMIN_ROLES, ADMIN_ONLY } from '@/constants/roles';

/** مسارات لوحة التحكم — admin و accountant */
export const adminRoutes = (
  <>
    {/* Admin & Accountant Routes */}
    <Route path="/dashboard" element={pr(ADMIN_ROLES, <AdminDashboard />)} />
    <Route path="/dashboard/properties" element={pr(ADMIN_ROLES, <PropertiesPage />)} />
    <Route path="/dashboard/contracts" element={pr(ADMIN_ROLES, <ContractsPage />)} />
    <Route path="/dashboard/income" element={pr(ADMIN_ROLES, <IncomePage />)} />
    <Route path="/dashboard/expenses" element={pr(ADMIN_ROLES, <ExpensesPage />)} />
    <Route path="/dashboard/beneficiaries" element={pr(ADMIN_ROLES, <BeneficiariesPage />)} />
    <Route path="/dashboard/reports" element={pr(ADMIN_ROLES, <ReportsPage />)} />
    <Route path="/dashboard/accounts" element={pr(ADMIN_ROLES, <AccountsPage />)} />
    <Route path="/dashboard/messages" element={pr(ADMIN_ROLES, <MessagesPage />)} />
    <Route path="/dashboard/invoices" element={pr(ADMIN_ROLES, <InvoicesPage />)} />
    <Route path="/dashboard/audit-log" element={pr(ADMIN_ROLES, <AuditLogPage />)} />
    <Route path="/dashboard/bylaws" element={pr(ADMIN_ROLES, <BylawsPage />)} />
    <Route path="/dashboard/support" element={pr(ADMIN_ROLES, <SupportDashboardPage />)} />
    <Route path="/dashboard/annual-report" element={pr(ADMIN_ROLES, <AnnualReportPage />)} />
    <Route path="/dashboard/chart-of-accounts" element={pr(ADMIN_ROLES, <ChartOfAccountsPage />)} />
    <Route path="/dashboard/comparison" element={pr(ADMIN_ROLES, <HistoricalComparisonPage />)} />

    {/* Admin Only */}
    <Route path="/dashboard/users" element={pr(ADMIN_ONLY, <UserManagementPage />)} />
    <Route path="/dashboard/settings" element={pr(ADMIN_ONLY, <SettingsPage />)} />
    <Route path="/dashboard/zatca" element={pr(ADMIN_ONLY, <ZatcaManagementPage />)} />
    <Route path="/dashboard/diagnostics" element={pr(ADMIN_ONLY, <SystemDiagnosticsPage />)} />
  </>
);
