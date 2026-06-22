/**
 * Integration smoke — يحمّل كل صفحات الناظر والمستفيد ديناميكياً
 * للتأكد من أن رسم الـ module graph + side effects أثناء import لا ترمي.
 *
 * هذا الاختبار لا يُركّب الصفحات (يتطلب موك واسع لـ Supabase + Auth + FiscalYear)،
 * لكنه يضمن أن كل lazy import في src/routes/* يُحَل بنجاح كما سيحدث في الإنتاج.
 */
import { describe, it, expect } from 'vitest';

// كل صفحات الناظر/المحاسب — مأخوذة من src/routes/adminRoutes.tsx
const adminPages = [
  () => import('@/pages/dashboard/AdminDashboard'),
  () => import('@/pages/dashboard/PropertiesPage'),
  () => import('@/pages/dashboard/ContractsPage'),
  () => import('@/pages/dashboard/IncomePage'),
  () => import('@/pages/dashboard/ExpensesPage'),
  () => import('@/pages/dashboard/BeneficiariesPage'),
  () => import('@/pages/dashboard/ReportsPage'),
  () => import('@/pages/dashboard/AccountsPage'),
  () => import('@/pages/dashboard/DistributionsPage'),
  () => import('@/pages/dashboard/MessagesPage'),
  () => import('@/pages/dashboard/InvoicesPage'),
  () => import('@/pages/dashboard/AuditLogPage'),
  () => import('@/pages/dashboard/BylawsPage'),
  () => import('@/pages/dashboard/SupportDashboardPage'),
  () => import('@/pages/dashboard/AnnualReportPage'),
  () => import('@/pages/dashboard/ChartOfAccountsPage'),
  () => import('@/pages/dashboard/HistoricalComparisonPage'),
  () => import('@/pages/dashboard/UserManagementPage'),
  () => import('@/pages/dashboard/SettingsPage'),
  () => import('@/pages/dashboard/ZatcaManagementPage'),
  () => import('@/pages/dashboard/SystemDiagnosticsPage'),
  () => import('@/pages/dashboard/EmailMonitorPage'),
] as const;

// كل صفحات المستفيد — مأخوذة من src/routes/beneficiaryRoutes.tsx
const beneficiaryPages = [
  () => import('@/pages/beneficiary/BeneficiaryDashboard'),
  () => import('@/pages/beneficiary/PropertiesViewPage'),
  () => import('@/pages/beneficiary/ContractsViewPage'),
  () => import('@/pages/beneficiary/DisclosurePage'),
  () => import('@/pages/beneficiary/MySharePage'),
  () => import('@/pages/beneficiary/FinancialReportsPage'),
  () => import('@/pages/beneficiary/AccountsViewPage'),
  () => import('@/pages/beneficiary/BeneficiarySettingsPage'),
  () => import('@/pages/beneficiary/BeneficiaryMessagesPage'),
  () => import('@/pages/beneficiary/InvoicesViewPage'),
  () => import('@/pages/beneficiary/ExpensesViewPage'),
  () => import('@/pages/beneficiary/NotificationsPage'),
  () => import('@/pages/beneficiary/BylawsViewPage'),
  () => import('@/pages/beneficiary/CarryforwardHistoryPage'),
  () => import('@/pages/beneficiary/SupportPageGuard'),
  () => import('@/pages/beneficiary/AnnualReportViewPage'),
] as const;

describe('integration smoke — admin pages load', () => {
  it.each(adminPages.map((loader) => [loader.toString().match(/pages\/[^'")]+/)?.[0] ?? 'unknown', loader] as const))(
    '%s يُحمَّل بدون أخطاء',
    async (_label, loader) => {
      const mod = await loader();
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    },
    60_000,
  );
});

describe('integration smoke — beneficiary pages load', () => {
  it.each(beneficiaryPages.map((loader) => [loader.toString().match(/pages\/[^'")]+/)?.[0] ?? 'unknown', loader] as const))(
    '%s يُحمَّل بدون أخطاء',
    async (_label, loader) => {
      const mod = await loader();
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    },
    60_000,
  );
});

describe('integration smoke — App boots', () => {
  it('App.tsx + router + providers يُحمَّلون بدون أخطاء', async () => {
    const [appMod, routerMod, providersMod, layoutMod] = await Promise.all([
      import('@/App'),
      import('@/app/router'),
      import('@/app/providers'),
      import('@/app/root-layout'),
    ]);
    expect(appMod.default).toBeDefined();
    expect(routerMod.AppRouter).toBeDefined();
    expect(providersMod.AppProviders).toBeDefined();
    expect(layoutMod.RootLayout).toBeDefined();
  });
});
