import { Route } from "react-router-dom";
import ProtectedRoute from "@/components/auth/ProtectedRoute"; // reorganized
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { withRouteErrorBoundary as eb } from "./withRouteErrorBoundary";

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

import type { AppRole } from '@/types/database';
import type { ReactNode } from 'react';

/** دالة مساعدة لتقليل التكرار */
const pr = (roles: AppRole[], page: ReactNode) =>
  eb(<ProtectedRoute allowedRoles={roles}>{page}</ProtectedRoute>);

const ADMIN_ACC: AppRole[] = ['admin', 'accountant'];
const ADMIN_ONLY: AppRole[] = ['admin'];

/** مسارات لوحة التحكم — admin و accountant */
export const adminRoutes = (
  <>
    {/* Admin & Accountant Routes */}
    <Route path="/dashboard" element={pr(ADMIN_ACC, <AdminDashboard />)} />
    <Route path="/dashboard/properties" element={pr(ADMIN_ACC, <PropertiesPage />)} />
    <Route path="/dashboard/contracts" element={pr(ADMIN_ACC, <ContractsPage />)} />
    <Route path="/dashboard/income" element={pr(ADMIN_ACC, <IncomePage />)} />
    <Route path="/dashboard/expenses" element={pr(ADMIN_ACC, <ExpensesPage />)} />
    <Route path="/dashboard/beneficiaries" element={pr(ADMIN_ACC, <BeneficiariesPage />)} />
    <Route path="/dashboard/reports" element={pr(ADMIN_ACC, <ReportsPage />)} />
    <Route path="/dashboard/accounts" element={pr(ADMIN_ACC, <AccountsPage />)} />
    <Route path="/dashboard/messages" element={pr(ADMIN_ACC, <MessagesPage />)} />
    <Route path="/dashboard/invoices" element={pr(ADMIN_ACC, <InvoicesPage />)} />
    <Route path="/dashboard/audit-log" element={pr(ADMIN_ACC, <AuditLogPage />)} />
    <Route path="/dashboard/bylaws" element={pr(ADMIN_ACC, <BylawsPage />)} />
    <Route path="/dashboard/support" element={pr(ADMIN_ACC, <SupportDashboardPage />)} />
    <Route path="/dashboard/annual-report" element={pr(ADMIN_ACC, <AnnualReportPage />)} />
    <Route path="/dashboard/chart-of-accounts" element={pr(ADMIN_ACC, <ChartOfAccountsPage />)} />
    <Route path="/dashboard/comparison" element={pr(ADMIN_ACC, <HistoricalComparisonPage />)} />

    {/* Admin Only */}
    <Route path="/dashboard/users" element={pr(ADMIN_ONLY, <UserManagementPage />)} />
    <Route path="/dashboard/settings" element={pr(ADMIN_ONLY, <SettingsPage />)} />
    <Route path="/dashboard/zatca" element={pr(ADMIN_ONLY, <ZatcaManagementPage />)} />
    <Route path="/dashboard/diagnostics" element={pr(ADMIN_ONLY, <SystemDiagnosticsPage />)} />
  </>
);
