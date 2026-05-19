/**
 * عقد ربط الصفحات الرئيسية بـ page-hook المتوقع.
 *
 * يمنع انحراف صفحة لاستهلاك بيانات صفحة أخرى (مثل أن تقرأ InvoicesViewPage
 * من useInvoicesPage الخاص بالناظر بدل useInvoicesViewPage). يثبّت الفصل بين
 * لوحات الناظر والمستفيد على مستوى مصدر البيانات.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');

interface Binding {
  file: string;
  hooks: string[]; // كل الـ hooks المتوقعة (يجب أن تكون كلها موجودة)
  forbidden?: string[]; // hooks يجب ألا تظهر (تسرّب طبقة)
}

const BINDINGS: Binding[] = [
  // ─── ناظر/محاسب ───
  { file: 'src/pages/dashboard/InvoicesPage.tsx', hooks: ['useInvoicesPage'], forbidden: ['useExpensesPage', 'useInvoicesViewPage'] },
  { file: 'src/pages/dashboard/ExpensesPage.tsx', hooks: ['useExpensesPage'], forbidden: ['useInvoicesPage', 'useExpensesViewPage'] },
  { file: 'src/pages/dashboard/ContractsPage.tsx', hooks: ['useContractsPage'], forbidden: ['useContractsViewPage'] },
  { file: 'src/pages/dashboard/BeneficiariesPage.tsx', hooks: ['useBeneficiariesPage'] },
  { file: 'src/pages/dashboard/AccountsPage.tsx', hooks: ['useAccountsPage'], forbidden: ['useAccountsViewPage'] },
  { file: 'src/pages/dashboard/IncomePage.tsx', hooks: ['useIncomePage'] },
  { file: 'src/pages/dashboard/PropertiesPage.tsx', hooks: ['usePropertiesPage'], forbidden: ['usePropertiesViewPage'] },
  { file: 'src/pages/dashboard/AdminDashboard.tsx', hooks: ['useAdminDashboardPage'], forbidden: ['useBeneficiaryDashboardPage'] },
  { file: 'src/pages/dashboard/SettingsPage.tsx', hooks: ['useSettingsPage'] },
  { file: 'src/pages/dashboard/AuditLogPage.tsx', hooks: ['useAuditLogPage'] },

  // ─── مستفيد ───
  { file: 'src/pages/beneficiary/InvoicesViewPage.tsx', hooks: ['useInvoicesViewPage'], forbidden: ['useInvoicesPage', 'useExpensesViewPage'] },
  { file: 'src/pages/beneficiary/ExpensesViewPage.tsx', hooks: ['useExpensesViewPage'], forbidden: ['useExpensesPage', 'useInvoicesViewPage'] },
  { file: 'src/pages/beneficiary/ContractsViewPage.tsx', hooks: ['useContractsViewPage'], forbidden: ['useContractsPage'] },
  { file: 'src/pages/beneficiary/PropertiesViewPage.tsx', hooks: ['usePropertiesViewPage'], forbidden: ['usePropertiesPage'] },
  { file: 'src/pages/beneficiary/AccountsViewPage.tsx', hooks: ['useAccountsViewPage'], forbidden: ['useAccountsPage'] },
  { file: 'src/pages/beneficiary/MySharePage.tsx', hooks: ['useMySharePage'] },
  { file: 'src/pages/beneficiary/FinancialReportsPage.tsx', hooks: ['useFinancialReportsPage'] },
  { file: 'src/pages/beneficiary/CarryforwardHistoryPage.tsx', hooks: ['useCarryforwardData'] },
  { file: 'src/pages/beneficiary/DisclosurePage.tsx', hooks: ['useDisclosurePage'] },
  { file: 'src/pages/beneficiary/BeneficiaryDashboard.tsx', hooks: ['useBeneficiaryDashboardPage'], forbidden: ['useAdminDashboardPage'] },
];

describe('Page → Page-Hook binding contract', () => {
  it.each(BINDINGS)('$file تستهلك الـ hook الصحيح', ({ file, hooks, forbidden }) => {
    const content = read(file);
    for (const hook of hooks) {
      expect(content, `${file} should import ${hook}`).toMatch(new RegExp(`\\b${hook}\\b`));
    }
    for (const banned of forbidden ?? []) {
      expect(content, `${file} must NOT use ${banned}`).not.toMatch(new RegExp(`\\b${banned}\\b`));
    }
  });
});
