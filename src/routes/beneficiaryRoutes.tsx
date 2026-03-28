import { Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { withRouteErrorBoundary as eb } from "./RouteErrorBoundary";

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

/** دالة مساعدة لتقليل التكرار */
const pr = (roles: string[], page: JSX.Element) =>
  eb(<ProtectedRoute allowedRoles={roles}>{page}</ProtectedRoute>);

const BEN = ['admin', 'beneficiary'];
const ALL = ['admin', 'beneficiary', 'waqif'];
const ALL_ACC = ['admin', 'beneficiary', 'waqif', 'accountant'];

/** مسارات المستفيدين والواقف */
export const beneficiaryRoutes = (
  <>
    <Route path="/beneficiary" element={pr(BEN, <BeneficiaryDashboard />)} />
    <Route path="/waqif" element={pr(['admin', 'waqif'], <WaqifDashboard />)} />
    <Route path="/beneficiary/properties" element={pr(ALL, <PropertiesViewPage />)} />
    <Route path="/beneficiary/contracts" element={pr(ALL, <ContractsViewPage />)} />
    <Route path="/beneficiary/disclosure" element={pr(BEN, <DisclosurePage />)} />
    <Route path="/beneficiary/my-share" element={pr(BEN, <MySharePage />)} />
    <Route path="/beneficiary/financial-reports" element={pr(ALL, <FinancialReportsPage />)} />
    <Route path="/beneficiary/accounts" element={pr(ALL, <AccountsViewPage />)} />
    <Route path="/beneficiary/settings" element={pr(ALL, <BeneficiarySettingsPage />)} />
    <Route path="/beneficiary/messages" element={pr(ALL, <BeneficiaryMessagesPage />)} />
    <Route path="/beneficiary/invoices" element={pr(ALL, <InvoicesViewPage />)} />
    <Route path="/beneficiary/notifications" element={pr(ALL, <NotificationsPage />)} />
    <Route path="/beneficiary/bylaws" element={pr(ALL, <BylawsViewPage />)} />
    <Route path="/beneficiary/carryforward" element={pr(ALL, <CarryforwardHistoryPage />)} />
    <Route path="/beneficiary/support" element={pr(ALL_ACC, <BeneficiarySupportPage />)} />
    <Route path="/beneficiary/annual-report" element={pr(ALL, <AnnualReportViewPage />)} />
  </>
);
