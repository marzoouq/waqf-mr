
# خطة تحسين أداء التطبيق — 3 خطوات

## الخطوة 1: تغليف القيمة المُرجعة من `useComputedFinancials` بـ `useMemo`

**الملف:** `src/hooks/financial/useComputedFinancials.ts`

السطر 129-146 يُرجع كائن جديد كل render. التعديل: تغليف بـ `useMemo` نهائي:

```ts
return useMemo(() => ({
  currentAccount, isAccountMissing, usingFallbackPct,
  adminPct, waqifPct, totalIncome, totalExpenses,
  zakatAmount, vatAmount, waqfCorpusPrevious, waqfCorpusManual,
  distributionsAmount, ...financials,
  incomeBySource, expensesByType, expensesByTypeExcludingVat,
}), [
  currentAccount, isAccountMissing, usingFallbackPct,
  adminPct, waqifPct, totalIncome, totalExpenses,
  zakatAmount, vatAmount, waqfCorpusPrevious, waqfCorpusManual,
  distributionsAmount, financials, incomeBySource, expensesByType, expensesByTypeExcludingVat,
]);
```

## الخطوة 2: إضافة `memo()` لـ 6 مكونات ثقيلة

لكل مكون: إضافة `import { memo } from 'react'` وتغيير `export default` إلى `export default memo(ComponentName)`:

| الملف | السطر الحالي | التغيير |
|-------|-------------|---------|
| `AccountsBeneficiariesTable.tsx` | `export default AccountsBeneficiariesTable` (133) | `export default memo(AccountsBeneficiariesTable)` |
| `AccountsContractsTable.tsx` | `export default AccountsContractsTable` (152) | `export default memo(AccountsContractsTable)` |
| `MonthlyPerformanceReport.tsx` | `export default MonthlyPerformanceReport` (224) | `export default memo(MonthlyPerformanceReport)` |
| `CashFlowReport.tsx` | `export default CashFlowReport` (آخر سطر) | `export default memo(CashFlowReport)` |
| `MonthlyAccrualTable.tsx` | `export default MonthlyAccrualTable` (193) | `export default memo(MonthlyAccrualTable)` |
| `ExpensesPieChart.tsx` | `export default ExpensesPieChart` (آخر سطر) | `export default memo(ExpensesPieChart)` |

## الخطوة 3: استخراج `useRetryQueries` hook مشترك

**ملف جديد:** `src/hooks/ui/useRetryQueries.ts`

```ts
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useRetryQueries(queryKeys: string[]) {
  const queryClient = useQueryClient();
  const handleRetry = useCallback(() => {
    queryKeys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
  }, [queryClient, queryKeys]);
  return handleRetry;
}
```

**تحديث 10 ملفات** — حذف `useQueryClient` و `handleRetry` اليدوي واستبداله:

| الملف | query keys |
|-------|-----------|
| `useAccountsViewPage` | `['accounts']` |
| `useInvoicesViewPage` | `['invoices']` |
| `useNotificationsPage` | `['notifications']` |
| `useBylawsViewPage` | `['bylaws']` |
| `useBeneficiaryMessages` | `['conversations']` |
| `useBeneficiaryDashboardPage` | `['beneficiary-dashboard']` |
| `useFinancialReportsPage` | `['financial-summary', 'beneficiaries']` |
| `useDisclosurePage` | `['income', 'expenses', 'accounts', 'beneficiaries', 'app-settings']` |
| `useMySharePage` | `['income', 'expenses', 'accounts', 'beneficiaries', 'app-settings']` |
| `useCarryforwardData` | `['advance_carryforward', 'advance_requests', 'my-beneficiary']` |

ملاحظة: إذا كان الملف لا يزال يستخدم `queryClient` لأغراض أخرى، يبقى الاستيراد.

---

## الملخص

| # | الإجراء | الملفات | الأثر |
|---|---------|---------|-------|
| 1 | memoize return في `useComputedFinancials` | 1 | **عالي** |
| 2 | إضافة `memo()` لـ 6 مكونات | 6 | **متوسط** |
| 3 | استخراج `useRetryQueries` + تحديث 10 ملفات | 11 | **تنظيف** |

**إجمالي:** 18 ملف، صفر تغيير معماري، صفر تغيير في قاعدة البيانات.
