/**
 * عقد المسارات ↔ ملفات الصفحات
 *
 * يضمن لكل مسار مسجَّل في ADMIN_ROUTES و BENEFICIARY_ROUTES:
 *  - وجود ملف Page مقابل تحت src/pages/.
 *  - الـ Page تستورد على الأقل page-hook واحد من @/hooks/page/  أو @/hooks/application/
 *    أو @/hooks/auth/ (للصفحات الإدارية المختصة كـ UserManagement).
 *  - الـ Page لا تستورد @/integrations/supabase/client مباشرة (Page Hook Pattern).
 *
 * هذا الاختبار حارس انحدار: أي صفحة جديدة تُضاف للسجل دون hook ستفشل هنا.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ADMIN_ROUTES, BENEFICIARY_ROUTES } from '@/constants/routeRegistry';

const ROOT = process.cwd();

/** خريطة مسار → ملف Page. المسارات غير المذكورة تتبع الاشتقاق الافتراضي. */
const ROUTE_TO_FILE: Record<string, string> = {
  '/dashboard': 'src/pages/dashboard/AdminDashboard.tsx',
  '/dashboard/properties': 'src/pages/dashboard/PropertiesPage.tsx',
  '/dashboard/contracts': 'src/pages/dashboard/ContractsPage.tsx',
  '/dashboard/income': 'src/pages/dashboard/IncomePage.tsx',
  '/dashboard/expenses': 'src/pages/dashboard/ExpensesPage.tsx',
  '/dashboard/beneficiaries': 'src/pages/dashboard/BeneficiariesPage.tsx',
  '/dashboard/reports': 'src/pages/dashboard/ReportsPage.tsx',
  '/dashboard/accounts': 'src/pages/dashboard/AccountsPage.tsx',
  '/dashboard/users': 'src/pages/dashboard/UserManagementPage.tsx',
  '/dashboard/settings': 'src/pages/dashboard/SettingsPage.tsx',
  '/dashboard/messages': 'src/pages/dashboard/MessagesPage.tsx',
  '/dashboard/invoices': 'src/pages/dashboard/InvoicesPage.tsx',
  '/dashboard/audit-log': 'src/pages/dashboard/AuditLogPage.tsx',
  '/dashboard/bylaws': 'src/pages/dashboard/BylawsPage.tsx',
  '/dashboard/zatca': 'src/pages/dashboard/ZatcaManagementPage.tsx',
  '/dashboard/annual-report': 'src/pages/dashboard/AnnualReportPage.tsx',
  '/dashboard/support': 'src/pages/dashboard/SupportDashboardPage.tsx',
  '/dashboard/chart-of-accounts': 'src/pages/dashboard/ChartOfAccountsPage.tsx',
  '/dashboard/comparison': 'src/pages/dashboard/HistoricalComparisonPage.tsx',
  '/dashboard/diagnostics': 'src/pages/dashboard/SystemDiagnosticsPage.tsx',
  '/dashboard/email-monitor': 'src/pages/dashboard/EmailMonitorPage.tsx',
  '/dashboard/distributions': 'src/pages/dashboard/DistributionsPage.tsx',

  '/beneficiary': 'src/pages/beneficiary/BeneficiaryDashboard.tsx',
  '/beneficiary/properties': 'src/pages/beneficiary/PropertiesViewPage.tsx',
  '/beneficiary/contracts': 'src/pages/beneficiary/ContractsViewPage.tsx',
  '/beneficiary/disclosure': 'src/pages/beneficiary/DisclosurePage.tsx',
  '/beneficiary/my-share': 'src/pages/beneficiary/MySharePage.tsx',
  '/beneficiary/carryforward': 'src/pages/beneficiary/CarryforwardHistoryPage.tsx',
  '/beneficiary/financial-reports': 'src/pages/beneficiary/FinancialReportsPage.tsx',
  '/beneficiary/accounts': 'src/pages/beneficiary/AccountsViewPage.tsx',
  '/beneficiary/messages': 'src/pages/beneficiary/BeneficiaryMessagesPage.tsx',
  '/beneficiary/notifications': 'src/pages/beneficiary/NotificationsPage.tsx',
  '/beneficiary/invoices': 'src/pages/beneficiary/InvoicesViewPage.tsx',
  '/beneficiary/expenses': 'src/pages/beneficiary/ExpensesViewPage.tsx',
  '/beneficiary/bylaws': 'src/pages/beneficiary/BylawsViewPage.tsx',
  '/beneficiary/settings': 'src/pages/beneficiary/BeneficiarySettingsPage.tsx',
  '/beneficiary/support': 'src/pages/beneficiary/SupportPage.tsx',
  '/beneficiary/annual-report': 'src/pages/beneficiary/AnnualReportViewPage.tsx',
  '/waqif': 'src/pages/beneficiary/BeneficiaryDashboard.tsx',
};

const HOOK_IMPORT_RE = /from\s+['"]@\/hooks\/(page|application|auth)\//;
const DIRECT_SUPABASE_RE = /from\s+['"]@\/integrations\/supabase\/client['"]/;

describe('Dashboard routes ↔ pages contract', () => {
  const allRoutes = { ...ADMIN_ROUTES, ...BENEFICIARY_ROUTES };

  it.each(Object.keys(allRoutes))('المسار %s مربوط بملف Page موجود', (route) => {
    const file = ROUTE_TO_FILE[route];
    expect(file, `Missing ROUTE_TO_FILE entry for ${route}`).toBeTruthy();
    expect(existsSync(resolve(ROOT, file!)), `File not found: ${file}`).toBe(true);
  });

  it.each(Object.entries(ROUTE_TO_FILE))(
    'الصفحة %s تستورد page-hook من الطبقة الصحيحة',
    (_route, file) => {
      const content = readFileSync(resolve(ROOT, file), 'utf8');
      expect(content, `${file} must import a page/application/auth hook`).toMatch(HOOK_IMPORT_RE);
    },
  );

  it.each(Object.entries(ROUTE_TO_FILE))(
    'الصفحة %s لا تستورد supabase/client مباشرة (Page Hook Pattern)',
    (_route, file) => {
      const content = readFileSync(resolve(ROOT, file), 'utf8');
      expect(content, `${file} must NOT import supabase client directly`).not.toMatch(DIRECT_SUPABASE_RE);
    },
  );
});
