# الموجة D — `financialKeys.ts`

## 1. إنشاء factory موحّد

**ملف جديد:** `src/lib/queryKeys/financialKeys.ts` (~80 سطر، ≤200)

يغطي 12 prefix منفصل ضمن namespace واحد:

```text
financialKeys.accounts.byFiscalYear(idOrLabel)        → ['accounts', 'fiscal_year', key]
financialKeys.accounts.prefix                          → ['accounts']
financialKeys.income.byFiscalYear(fyId)                → ['income', 'fiscal_year', fyId]
financialKeys.income.prefix                            → ['income']
financialKeys.income.comparison()                      → ['income_comparison_raw']
financialKeys.expenses.byFiscalYear(fyId)              → ['expenses', 'fiscal_year', fyId]
financialKeys.expenses.prefix                          → ['expenses']
financialKeys.expenses.budgets(fyId)                   → ['expense_budgets', fyId]
financialKeys.expenses.budgetsPrefix                   → ['expense_budgets']
financialKeys.distributions.prefix                     → ['distributions']
financialKeys.distributions.aggregated(fyId)           → ['aggregated-distributions', fyId]
financialKeys.distributions.my(beneficiaryId, fyId)    → ['my-distributions', beneficiaryId, fyId]
financialKeys.distributions.myPrefix                   → ['my-distributions']
financialKeys.beneficiaryProfile.byUser(userId)        → ['my-beneficiary', userId]
financialKeys.beneficiaryProfile.prefix                → ['my-beneficiary']
financialKeys.dashboard.totalBeneficiaryPercentage()   → ['total-beneficiary-percentage']
financialKeys.fiscalYearComparison.multi(sortedIds)    → ['multi-year-summary', sortedIds]
financialKeys.fiscalYearComparison.pair(id1, id2)      → ['year-comparison-summary', id1, id2]
```

> ملاحظة: `useAccounts` و `useIncome` و `useExpenses` يستخدمون `createCrudFactory({ queryKey: '...' })` للـ CRUD الأساسي؛ السلسلة هناك مستهلكة داخلياً (وليست `queryKey: [...]`)، لذلك تبقى كما هي ومتوافقة مع `prefix` المُعرَّف.

## 2. تحديث 11 ملف data

| الملف | التغيير |
|---|---|
| `hooks/data/financial/accounts/useAccounts.ts` | سطر 36 → `financialKeys.accounts.byFiscalYear(...)` |
| `hooks/data/financial/income/useIncome.ts` | سطر 50 → `financialKeys.income.byFiscalYear(fiscalYearId)` |
| `hooks/data/financial/income/useIncomeComparison.ts` | سطر 22 → `financialKeys.income.comparison()` |
| `hooks/data/financial/expenses/useExpenses.ts` | سطر 50 → `financialKeys.expenses.byFiscalYear(fiscalYearId)` |
| `hooks/data/financial/expenses/useExpenseBudgets.ts` | سطر 18 + 51 → `financialKeys.expenses.budgets(fiscalYearId)` |
| `hooks/data/financial/distribution/useDistribute.ts` | أسطر 35-37 → `financialKeys.distributions.prefix` + `.myPrefix` + `accounts.prefix` |
| `hooks/data/financial/dashboard/useTotalBeneficiaryPercentage.ts` | سطر 16 → `financialKeys.dashboard.totalBeneficiaryPercentage()` |
| `hooks/data/financial/fiscalYears/useMultiYearSummary.ts` | سطر 18 → `financialKeys.fiscalYearComparison.multi(sortedIds)` |
| `hooks/data/financial/fiscalYears/useYearComparisonData.ts` | سطر 42 → `financialKeys.fiscalYearComparison.pair(year1Id, year2Id)` |
| `hooks/data/beneficiaries/useMyDistributions.ts` | سطر 10 → `financialKeys.distributions.my(beneficiaryId, fiscalYearId)` |
| `hooks/data/beneficiaries/useMyBeneficiaryProfile.ts` | سطر 9 → `financialKeys.beneficiaryProfile.byUser(userId)` |

## 3. تحديث Cross-domain invalidations

| الملف | التغيير |
|---|---|
| `hooks/data/invoices/usePaymentInvoices.ts` | سطران 83 + 100: `['income']` → `financialKeys.income.prefix` |
| `hooks/data/contracts/useTenantPayments.ts` | سطر 66: `['income']` → `financialKeys.income.prefix` |
| `hooks/data/financial/advances/useAdvanceRequests.ts` | سطر 111: `['accounts']` → `financialKeys.accounts.prefix` |
| `hooks/page/admin/dashboard/useAggregatedAnnualReport.ts` | سطر 35: `['aggregated-distributions', fiscalYearId]` → `financialKeys.distributions.aggregated(fiscalYearId)` |

## 4. التحقق

```bash
rg -n "queryKey:\s*\[['\"](?:income|expenses|expense_budgets|accounts|distributions|my-distributions|my-beneficiary|total-beneficiary-percentage|multi-year-summary|year-comparison-summary|income_comparison_raw|aggregated-distributions)" src/hooks
# expected: 0
```

تبقى `useRetryQueries(['my-distributions', 'my-beneficiary', ...])` في `hooks/page/beneficiary/financial/` كمدخلات نصية (مغطّاة بالخطوة #5 لاحقاً، ليست ضمن هذه الموجة).

## نطاق محدود

- لا تغيير لمنطق الأعمال أو signatures
- لا تعديل ملفات اختبار في هذه الموجة (يُحقَّق بعد البناء)
- إجمالي الملفات: 1 جديد + 15 تعديل
