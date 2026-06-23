import { Route } from "react-router-dom";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { pr } from "./ProtectedRouteHelper";

const BeneficiaryDashboard = lazyWithRetry(() => import("@/pages/beneficiary/BeneficiaryDashboard"));
const DisclosurePage = lazyWithRetry(() => import("@/pages/beneficiary/DisclosurePage"));
const MySharePage = lazyWithRetry(() => import("@/pages/beneficiary/MySharePage"));
const FinancialReportsPage = lazyWithRetry(() => import("@/pages/beneficiary/FinancialReportsPage"));
const AccountsViewPage = lazyWithRetry(() => import("@/pages/beneficiary/AccountsViewPage"));
const BeneficiarySettingsPage = lazyWithRetry(() => import("@/pages/beneficiary/BeneficiarySettingsPage"));
const BeneficiaryMessagesPage = lazyWithRetry(() => import("@/pages/beneficiary/BeneficiaryMessagesPage"));
const InvoicesViewPage = lazyWithRetry(() => import("@/pages/beneficiary/InvoicesViewPage"));
const ExpensesViewPage = lazyWithRetry(() => import("@/pages/beneficiary/ExpensesViewPage"));
const NotificationsPage = lazyWithRetry(() => import("@/pages/beneficiary/NotificationsPage"));
const BylawsViewPage = lazyWithRetry(() => import("@/pages/beneficiary/BylawsViewPage"));
const PropertiesViewPage = lazyWithRetry(() => import("@/pages/beneficiary/PropertiesViewPage"));
const ContractsViewPage = lazyWithRetry(() => import("@/pages/beneficiary/ContractsViewPage"));
const CarryforwardHistoryPage = lazyWithRetry(() => import("@/pages/beneficiary/CarryforwardHistoryPage"));

const BeneficiarySupportPage = lazyWithRetry(() => import("@/pages/beneficiary/SupportPageGuard"));
const AnnualReportViewPage = lazyWithRetry(() => import("@/pages/beneficiary/AnnualReportViewPage"));
const ArchiveViewPage = lazyWithRetry(() => import("@/pages/beneficiary/ArchiveViewPage"));

import { BENEFICIARY_ROLES, ALL_NON_ACCOUNTANT } from '@/constants/roles';

/** مسارات المستفيدين والواقف */
export const beneficiaryRoutes = (
  <>
    <Route path="/beneficiary" element={pr(BENEFICIARY_ROLES, <BeneficiaryDashboard />)} />
    <Route path="/beneficiary/properties" element={pr(ALL_NON_ACCOUNTANT, <PropertiesViewPage />)} />
    <Route path="/beneficiary/contracts" element={pr(ALL_NON_ACCOUNTANT, <ContractsViewPage />)} />
    <Route path="/beneficiary/disclosure" element={pr(BENEFICIARY_ROLES, <DisclosurePage />)} />
    <Route path="/beneficiary/my-share" element={pr(BENEFICIARY_ROLES, <MySharePage />)} />
    <Route path="/beneficiary/financial-reports" element={pr(ALL_NON_ACCOUNTANT, <FinancialReportsPage />)} />
    <Route path="/beneficiary/accounts" element={pr(ALL_NON_ACCOUNTANT, <AccountsViewPage />)} />
    <Route path="/beneficiary/settings" element={pr(ALL_NON_ACCOUNTANT, <BeneficiarySettingsPage />)} />
    <Route path="/beneficiary/messages" element={pr(BENEFICIARY_ROLES, <BeneficiaryMessagesPage />)} />
    <Route path="/beneficiary/invoices" element={pr(ALL_NON_ACCOUNTANT, <InvoicesViewPage />)} />
    <Route path="/beneficiary/expenses" element={pr(ALL_NON_ACCOUNTANT, <ExpensesViewPage />)} />
    <Route path="/beneficiary/notifications" element={pr(BENEFICIARY_ROLES, <NotificationsPage />)} />
    <Route path="/beneficiary/bylaws" element={pr(ALL_NON_ACCOUNTANT, <BylawsViewPage />)} />
    <Route path="/beneficiary/carryforward" element={pr(BENEFICIARY_ROLES, <CarryforwardHistoryPage />)} />
    <Route path="/beneficiary/support" element={pr(BENEFICIARY_ROLES, <BeneficiarySupportPage />)} />
    <Route path="/beneficiary/annual-report" element={pr(ALL_NON_ACCOUNTANT, <AnnualReportViewPage />)} />
    <Route path="/beneficiary/archive" element={pr(ALL_NON_ACCOUNTANT, <ArchiveViewPage />)} />
  </>
);
