import { Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

const BeneficiaryDashboard = lazyWithRetry(() => import("@/pages/beneficiary/BeneficiaryDashboard"));
const DisclosurePage = lazyWithRetry(() => import("@/pages/beneficiary/DisclosurePage"));
const MySharePage = lazyWithRetry(() => import("@/pages/beneficiary/MySharePage"));
const FinancialReportsPage = lazyWithRetry(() => import("@/pages/beneficiary/FinancialReportsPage"));
const AccountsViewPage = lazyWithRetry(() => import("@/pages/beneficiary/AccountsViewPage"));
const BeneficiarySettingsPage = lazyWithRetry(() => import("@/pages/beneficiary/BeneficiarySettingsPage"));
const BeneficiaryMessagesPage = lazyWithRetry(() => import("@/pages/beneficiary/BeneficiaryMessagesPage"));
const InvoicesViewPage = lazyWithRetry(() => import("@/pages/beneficiary/InvoicesViewPage"));
const NotificationsPage = lazyWithRetry(() => import("@/pages/beneficiary/NotificationsPage"));
const BylawsViewPage = lazyWithRetry(() => import("@/pages/beneficiary/BylawsViewPage"));
const PropertiesViewPage = lazyWithRetry(() => import("@/pages/beneficiary/PropertiesViewPage"));
const ContractsViewPage = lazyWithRetry(() => import("@/pages/beneficiary/ContractsViewPage"));
const CarryforwardHistoryPage = lazyWithRetry(() => import("@/pages/beneficiary/CarryforwardHistoryPage"));
const WaqifDashboard = lazyWithRetry(() => import("@/pages/beneficiary/WaqifDashboard"));
const BeneficiarySupportPage = lazyWithRetry(() => import("@/pages/beneficiary/SupportPage"));
const AnnualReportViewPage = lazyWithRetry(() => import("@/pages/beneficiary/AnnualReportViewPage"));

/** مسارات المستفيدين والواقف */
export const beneficiaryRoutes = (
  <>
    <Route path="/beneficiary" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary']}><BeneficiaryDashboard /></ProtectedRoute>} />
    <Route path="/waqif" element={<ProtectedRoute allowedRoles={['admin', 'waqif']}><WaqifDashboard /></ProtectedRoute>} />
    <Route path="/beneficiary/properties" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}><PropertiesViewPage /></ProtectedRoute>} />
    <Route path="/beneficiary/contracts" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}><ContractsViewPage /></ProtectedRoute>} />
    <Route path="/beneficiary/disclosure" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary']}><DisclosurePage /></ProtectedRoute>} />
    <Route path="/beneficiary/my-share" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary']}><MySharePage /></ProtectedRoute>} />
    <Route path="/beneficiary/financial-reports" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}><FinancialReportsPage /></ProtectedRoute>} />
    <Route path="/beneficiary/accounts" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}><AccountsViewPage /></ProtectedRoute>} />
    <Route path="/beneficiary/settings" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}><BeneficiarySettingsPage /></ProtectedRoute>} />
    <Route path="/beneficiary/messages" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}><BeneficiaryMessagesPage /></ProtectedRoute>} />
    <Route path="/beneficiary/invoices" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}><InvoicesViewPage /></ProtectedRoute>} />
    <Route path="/beneficiary/notifications" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}><NotificationsPage /></ProtectedRoute>} />
    <Route path="/beneficiary/bylaws" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}><BylawsViewPage /></ProtectedRoute>} />
    <Route path="/beneficiary/carryforward" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}><CarryforwardHistoryPage /></ProtectedRoute>} />
    <Route path="/beneficiary/support" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif', 'accountant']}><BeneficiarySupportPage /></ProtectedRoute>} />
    <Route path="/beneficiary/annual-report" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}><AnnualReportViewPage /></ProtectedRoute>} />
  </>
);
