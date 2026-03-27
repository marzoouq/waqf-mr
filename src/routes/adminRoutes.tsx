import { Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

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

/** مسارات لوحة التحكم — admin و accountant */
export const adminRoutes = (
  <>
    {/* Admin & Accountant Routes */}
    <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><AdminDashboard /></ProtectedRoute>} />
    <Route path="/dashboard/properties" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><PropertiesPage /></ProtectedRoute>} />
    <Route path="/dashboard/contracts" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><ContractsPage /></ProtectedRoute>} />
    <Route path="/dashboard/income" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><IncomePage /></ProtectedRoute>} />
    <Route path="/dashboard/expenses" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><ExpensesPage /></ProtectedRoute>} />
    <Route path="/dashboard/beneficiaries" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><BeneficiariesPage /></ProtectedRoute>} />
    <Route path="/dashboard/reports" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><ReportsPage /></ProtectedRoute>} />
    <Route path="/dashboard/accounts" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><AccountsPage /></ProtectedRoute>} />
    <Route path="/dashboard/messages" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><MessagesPage /></ProtectedRoute>} />
    <Route path="/dashboard/invoices" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><InvoicesPage /></ProtectedRoute>} />
    <Route path="/dashboard/audit-log" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><AuditLogPage /></ProtectedRoute>} />
    <Route path="/dashboard/bylaws" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><BylawsPage /></ProtectedRoute>} />
    <Route path="/dashboard/support" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><SupportDashboardPage /></ProtectedRoute>} />
    <Route path="/dashboard/annual-report" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><AnnualReportPage /></ProtectedRoute>} />
    <Route path="/dashboard/chart-of-accounts" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><ChartOfAccountsPage /></ProtectedRoute>} />
    <Route path="/dashboard/comparison" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><HistoricalComparisonPage /></ProtectedRoute>} />

    {/* Admin Only */}
    <Route path="/dashboard/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagementPage /></ProtectedRoute>} />
    <Route path="/dashboard/settings" element={<ProtectedRoute allowedRoles={['admin']}><SettingsPage /></ProtectedRoute>} />
    <Route path="/dashboard/zatca" element={<ProtectedRoute allowedRoles={['admin']}><ZatcaManagementPage /></ProtectedRoute>} />
    <Route path="/dashboard/diagnostics" element={<ProtectedRoute allowedRoles={['admin']}><SystemDiagnosticsPage /></ProtectedRoute>} />
  </>
);
