import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";

// Admin Dashboard Pages
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import PropertiesPage from "./pages/dashboard/PropertiesPage";
import ContractsPage from "./pages/dashboard/ContractsPage";
import IncomePage from "./pages/dashboard/IncomePage";
import ExpensesPage from "./pages/dashboard/ExpensesPage";
import BeneficiariesPage from "./pages/dashboard/BeneficiariesPage";
import ReportsPage from "./pages/dashboard/ReportsPage";
import AccountsPage from "./pages/dashboard/AccountsPage";
import UserManagementPage from "./pages/dashboard/UserManagementPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import MessagesPage from "./pages/dashboard/MessagesPage";
import InvoicesPage from "./pages/dashboard/InvoicesPage";

// Beneficiary Pages
import BeneficiaryDashboard from "./pages/beneficiary/BeneficiaryDashboard";
import DisclosurePage from "./pages/beneficiary/DisclosurePage";
import MySharePage from "./pages/beneficiary/MySharePage";
import FinancialReportsPage from "./pages/beneficiary/FinancialReportsPage";
import AccountsViewPage from "./pages/beneficiary/AccountsViewPage";
import BeneficiaryMessagesPage from "./pages/beneficiary/BeneficiaryMessagesPage";
import InvoicesViewPage from "./pages/beneficiary/InvoicesViewPage";

// AI Assistant
import AiAssistant from "./components/AiAssistant";
import SecurityGuard from "./components/SecurityGuard";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Admin Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/properties"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <PropertiesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/contracts"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ContractsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/income"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <IncomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/expenses"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ExpensesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/beneficiaries"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <BeneficiariesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/reports"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/accounts"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AccountsPage />
                </ProtectedRoute>
              }
            />

            {/* User Management */}
            <Route
              path="/dashboard/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />

            {/* Settings */}
            <Route
              path="/dashboard/settings"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Messages */}
            <Route
              path="/dashboard/messages"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <MessagesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/invoices"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <InvoicesPage />
                </ProtectedRoute>
              }
            />
            {/* Beneficiary Routes (admin can also access) */}
            <Route
              path="/beneficiary"
              element={
                <ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}>
                  <BeneficiaryDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/beneficiary/disclosure"
              element={
                <ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}>
                  <DisclosurePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/beneficiary/share"
              element={
                <ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}>
                  <MySharePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/beneficiary/reports"
              element={
                <ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}>
                  <FinancialReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/beneficiary/accounts"
              element={
                <ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}>
                  <AccountsViewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/beneficiary/messages"
              element={
                <ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}>
                  <BeneficiaryMessagesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/beneficiary/invoices"
              element={
                <ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}>
                  <InvoicesViewPage />
                </ProtectedRoute>
              }
            />
            {/* Catch-all Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AiAssistant />
          <SecurityGuard />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
