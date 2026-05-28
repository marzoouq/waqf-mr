# `src/hooks/data/financial/` — استعلامات البيانات المالية

طبقة `hooks/data` نقية: تتعامل مباشرة مع Supabase عبر TanStack Query فقط، بدون toast ولا منطق محسوب.

## التنظيم (Sub-folders)

| المجلد | المحتوى |
|--------|---------|
| `accounts/` | `useAccounts`, `useAccountCategories` |
| `fiscalYears/` | `useFiscalYears`, `useFiscalYearSummary`, `useMultiYearSummary`, `useYearComparisonData`, `useCloseFiscalYear` |
| `advances/` | `useAdvanceQueries`, `useAdvanceRequests`, `useMaxAdvanceAmount`, `useDistributionAdvances` |
| `distribution/` | `useDistribute`, `useDistributionHistory`, `useDisbursementVouchers` |
| `expenses/` | `useExpenses`, `useExpenseBudgets` |
| `income/` | `useIncome`, `useIncomeComparison` |
| `dashboard/` | `useDashboardSummary`, `useTotalBeneficiaryPercentage` |
| `contracts/` | `useContractAllocations` |

## القواعد

- لا `sonner` ولا `toast` هنا — راجع `mem://conventions/no-toast-in-data-hooks`.
- لا استيراد من `hooks/domain/*` — اتجاه التبعية: `page → domain → data` فقط.
- لا re-exports من طبقات أعلى.
- استورد من المسار النهائي مباشرة: `@/hooks/data/financial/<sub>/<hook>`.
