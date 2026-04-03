import { Route } from "react-router-dom";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import RequirePermission from "@/components/guards/RequirePermission";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { withRouteErrorBoundary as eb } from "./withRouteErrorBoundary";

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

const BeneficiarySupportPage = lazyWithRetry(() => import("@/pages/beneficiary/SupportPage"));
const AnnualReportViewPage = lazyWithRetry(() => import("@/pages/beneficiary/AnnualReportViewPage"));

import type { ReactNode } from 'react';
import type { AppRole } from '@/types/database';
import { BENEFICIARY_ROLES, ALL_NON_ACCOUNTANT, ALL_ROLES } from '@/constants/roles';

/** دالة مساعدة — حماية دور + حماية صلاحيات */
const pr = (roles: AppRole[], page: ReactNode) =>
  eb(<ProtectedRoute allowedRoles={roles}><RequirePermission>{page}</RequirePermission></ProtectedRoute>);

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
    <Route path="/beneficiary/messages" element={pr(ALL_NON_ACCOUNTANT, <BeneficiaryMessagesPage />)} />
    <Route path="/beneficiary/invoices" element={pr(ALL_NON_ACCOUNTANT, <InvoicesViewPage />)} />
    <Route path="/beneficiary/notifications" element={pr(ALL_NON_ACCOUNTANT, <NotificationsPage />)} />
    <Route path="/beneficiary/bylaws" element={pr(ALL_NON_ACCOUNTANT, <BylawsViewPage />)} />
    <Route path="/beneficiary/carryforward" element={pr(ALL_NON_ACCOUNTANT, <CarryforwardHistoryPage />)} />
    <Route path="/beneficiary/support" element={pr(ALL_ROLES, <BeneficiarySupportPage />)} />
    <Route path="/beneficiary/annual-report" element={pr(ALL_NON_ACCOUNTANT, <AnnualReportViewPage />)} />
  </>
);
