/**
 * خريطة التحميل المسبق للمكوّنات (Component Prefetch)
 * يُحمّل ملفات JS الخاصة بالصفحة عند تمرير الماوس على الرابط
 * لتسريع التنقل بالإضافة لتحميل البيانات المسبق.
 */

/** دوال الاستيراد الديناميكي لكل مسار — تُنفّذ مرة واحدة فقط */
const componentImports: Record<string, () => Promise<unknown>> = {
  '/dashboard': () => import('@/pages/dashboard/AdminDashboard'),
  '/dashboard/properties': () => import('@/pages/dashboard/PropertiesPage'),
  '/dashboard/contracts': () => import('@/pages/dashboard/ContractsPage'),
  '/dashboard/income': () => import('@/pages/dashboard/IncomePage'),
  '/dashboard/expenses': () => import('@/pages/dashboard/ExpensesPage'),
  '/dashboard/beneficiaries': () => import('@/pages/dashboard/BeneficiariesPage'),
  '/dashboard/reports': () => import('@/pages/dashboard/ReportsPage'),
  '/dashboard/accounts': () => import('@/pages/dashboard/AccountsPage'),
  '/dashboard/messages': () => import('@/pages/dashboard/MessagesPage'),
  '/dashboard/invoices': () => import('@/pages/dashboard/InvoicesPage'),
  '/dashboard/audit-log': () => import('@/pages/dashboard/AuditLogPage'),
  '/dashboard/bylaws': () => import('@/pages/dashboard/BylawsPage'),
  '/dashboard/support': () => import('@/pages/dashboard/SupportDashboardPage'),
  '/dashboard/users': () => import('@/pages/dashboard/UserManagementPage'),
  '/dashboard/settings': () => import('@/pages/dashboard/SettingsPage'),
  '/dashboard/zatca': () => import('@/pages/dashboard/ZatcaManagementPage'),
  '/dashboard/annual-report': () => import('@/pages/dashboard/AnnualReportPage'),
  '/dashboard/chart-of-accounts': () => import('@/pages/dashboard/ChartOfAccountsPage'),
  '/dashboard/comparison': () => import('@/pages/dashboard/HistoricalComparisonPage'),
  '/dashboard/diagnostics': () => import('@/pages/dashboard/SystemDiagnosticsPage'),
  '/beneficiary': () => import('@/pages/beneficiary/BeneficiaryDashboard'),
  '/beneficiary/disclosure': () => import('@/pages/beneficiary/DisclosurePage'),
  '/beneficiary/my-share': () => import('@/pages/beneficiary/MySharePage'),
  '/beneficiary/financial-reports': () => import('@/pages/beneficiary/FinancialReportsPage'),
  '/beneficiary/accounts': () => import('@/pages/beneficiary/AccountsViewPage'),
  '/beneficiary/settings': () => import('@/pages/beneficiary/BeneficiarySettingsPage'),
  '/beneficiary/messages': () => import('@/pages/beneficiary/BeneficiaryMessagesPage'),
  '/beneficiary/invoices': () => import('@/pages/beneficiary/InvoicesViewPage'),
  '/beneficiary/notifications': () => import('@/pages/beneficiary/NotificationsPage'),
  '/beneficiary/bylaws': () => import('@/pages/beneficiary/BylawsViewPage'),
  '/beneficiary/properties': () => import('@/pages/beneficiary/PropertiesViewPage'),
  '/beneficiary/contracts': () => import('@/pages/beneficiary/ContractsViewPage'),
  '/beneficiary/support': () => import('@/pages/beneficiary/SupportPage'),
  '/beneficiary/annual-report': () => import('@/pages/beneficiary/AnnualReportViewPage'),
  '/waqif': () => import('@/pages/beneficiary/WaqifDashboard'),
};

/** مجموعة المسارات التي تم تحميلها مسبقاً — لتجنب التكرار */
const prefetchedComponents = new Set<string>();

/**
 * يُحمّل مكوّن الصفحة مسبقاً (JS chunk) — مرة واحدة فقط لكل مسار.
 * يُستخدم عبر `requestIdleCallback` لعدم حجب التفاعل.
 */
export function prefetchComponent(path: string): void {
  if (prefetchedComponents.has(path)) return;

  const importFn = componentImports[path];
  if (!importFn) return;

  prefetchedComponents.add(path);

  const load = () => {
    importFn().catch(() => {
      // فشل التحميل — السماح بإعادة المحاولة لاحقاً
      prefetchedComponents.delete(path);
    });
  };

  // تأجيل التحميل لوقت الخمول لعدم التأثير على الأداء
  if ('requestIdleCallback' in window) {
    requestIdleCallback(load, { timeout: 3000 });
  } else {
    setTimeout(load, 100);
  }
}
