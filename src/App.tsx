import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { FiscalYearProvider } from "@/contexts/FiscalYearContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Pages - Lazy loaded
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const InstallApp = lazy(() => import("./pages/InstallApp"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

// Admin Dashboard Pages - Lazy loaded
const AdminDashboard = lazy(() => import("./pages/dashboard/AdminDashboard"));
const PropertiesPage = lazy(() => import("./pages/dashboard/PropertiesPage"));
const ContractsPage = lazy(() => import("./pages/dashboard/ContractsPage"));
const IncomePage = lazy(() => import("./pages/dashboard/IncomePage"));
const ExpensesPage = lazy(() => import("./pages/dashboard/ExpensesPage"));
const BeneficiariesPage = lazy(() => import("./pages/dashboard/BeneficiariesPage"));
const ReportsPage = lazy(() => import("./pages/dashboard/ReportsPage"));
const AccountsPage = lazy(() => import("./pages/dashboard/AccountsPage"));
const UserManagementPage = lazy(() => import("./pages/dashboard/UserManagementPage"));
const SettingsPage = lazy(() => import("./pages/dashboard/SettingsPage"));
const MessagesPage = lazy(() => import("./pages/dashboard/MessagesPage"));
const InvoicesPage = lazy(() => import("./pages/dashboard/InvoicesPage"));
const AuditLogPage = lazy(() => import("./pages/dashboard/AuditLogPage"));
const BylawsPage = lazy(() => import("./pages/dashboard/BylawsPage"));

// Beneficiary Pages - Lazy loaded
const BeneficiaryDashboard = lazy(() => import("./pages/beneficiary/BeneficiaryDashboard"));
const DisclosurePage = lazy(() => import("./pages/beneficiary/DisclosurePage"));
const MySharePage = lazy(() => import("./pages/beneficiary/MySharePage"));
const FinancialReportsPage = lazy(() => import("./pages/beneficiary/FinancialReportsPage"));
const AccountsViewPage = lazy(() => import("./pages/beneficiary/AccountsViewPage"));
const BeneficiarySettingsPage = lazy(() => import("./pages/beneficiary/BeneficiarySettingsPage"));
const BeneficiaryMessagesPage = lazy(() => import("./pages/beneficiary/BeneficiaryMessagesPage"));
const InvoicesViewPage = lazy(() => import("./pages/beneficiary/InvoicesViewPage"));
const NotificationsPage = lazy(() => import("./pages/beneficiary/NotificationsPage"));
const BylawsViewPage = lazy(() => import("./pages/beneficiary/BylawsViewPage"));
const PropertiesViewPage = lazy(() => import("./pages/beneficiary/PropertiesViewPage"));
const ContractsViewPage = lazy(() => import("./pages/beneficiary/ContractsViewPage"));

// AI Assistant & Security - Lazy loaded
const AiAssistant = lazy(() => import("./components/AiAssistant"));
const SecurityGuard = lazy(() => import("./components/SecurityGuard"));
const PwaUpdateNotifier = lazy(() => import("./components/PwaUpdateNotifier"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FiscalYearProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/unauthorized" element={<Unauthorized />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfUse />} />
                  <Route path="/terms-of-use" element={<TermsOfUse />} />
                  <Route path="/install" element={<InstallApp />} />
                  <Route path="/reset-password" element={<ResetPassword />} />

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

                  {/* Admin Only */}
                  <Route path="/dashboard/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagementPage /></ProtectedRoute>} />
                  <Route path="/dashboard/settings" element={<ProtectedRoute allowedRoles={['admin']}><SettingsPage /></ProtectedRoute>} />

                  {/* Beneficiary Routes (admin can also access) */}
                  <Route path="/beneficiary" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary']}><BeneficiaryDashboard /></ProtectedRoute>} />
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

                  {/* Catch-all Route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <Suspense fallback={null}>
                <AiAssistant />
                <SecurityGuard />
                <PwaUpdateNotifier />
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </FiscalYearProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
