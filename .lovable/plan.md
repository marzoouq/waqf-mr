

# خطة تحسين الأداء — المرحلة الثالثة

## نظرة عامة
6 تحسينات: 2 تغييرات في قاعدة البيانات (migration واحد)، و6 تعديلات كود.

---

## الخطوة 1: RPC متعدد السنوات — `get_multi_year_summary` (20 → 1)

**Migration:** إنشاء دالة `get_multi_year_summary(p_year_ids uuid[])` تُرجع `jsonb`.

المنطق: تكرار عبر `UNNEST(p_year_ids)` وبناء مصفوفة jsonb لكل سنة تحتوي:
- `year_id`, `label`, `status` (من `fiscal_years`)
- `total_income`, `total_expenses` (من `income`/`expenses`)
- بيانات الحساب المُقفل من `accounts` (إن وُجد): `vat_amount`, `zakat_amount`, `admin_share`, `waqif_share`, `waqf_revenue`, `net_after_expenses`, `net_after_vat`, `distributions_amount`
- `expenses_by_type`: تجميع من `expenses` حسب `expense_type`

النمط مُستلهم من `get_year_comparison_summary` الموجود.

**ملف جديد:** `src/hooks/financial/useMultiYearSummary.ts`
- يستدعي `supabase.rpc('get_multi_year_summary', { p_year_ids: yearIds })`
- يُحوّل النتيجة إلى مصفوفة بنفس واجهة `useFinancialSummary` (الحقول: `totalIncome`, `totalExpenses`, `expensesByType`, `vatAmount`, `zakatAmount`, `adminShare`, `waqifShare`, `waqfRevenue`, `netAfterExpenses`, `availableAmount`)

**تعديل:** `src/hooks/page/admin/useHistoricalComparison.ts`
- حذف `useYearData()` × 4 وحذف استيراد `useFinancialSummary`
- استدعاء `useMultiYearSummary(selectedYearIds)` 
- بناء `yearData` من النتيجة مع الحفاظ على نفس الواجهة (`totalIncome`, `totalExpenses`, `waqfRevenue`, `expensesByType` كـ `Record<string,number>` إلخ)

---

## الخطوة 2: إضافة `monthly_expenses` إلى RPC المستفيد + تحسين `useWaqifDashboardPage`

**Migration (نفس الملف):** تعديل `get_beneficiary_dashboard` لإضافة حقل `monthly_expenses` — نفس نمط `monthly_income`:
```sql
SELECT EXTRACT(MONTH FROM date)::int AS m, SUM(amount) AS t
FROM expenses WHERE fiscal_year_id = v_fy.id GROUP BY 1
```

**تعديل واجهة:** `useBeneficiaryDashboardData.ts` — إضافة `monthly_expenses: Array<{ month: number; total: number }>` إلى `BeneficiaryDashboardData`.

**تعديل:** `src/hooks/page/beneficiary/useWaqifDashboardPage.ts`
- استبدال `useFinancialSummary` بـ `useBeneficiaryDashboardData(fiscalYearId)`
- استخراج `totalIncome`, `totalExpenses`, `availableAmount`, `expensesByTypeExcludingVat` من بيانات الـ RPC
- بناء `monthlyData` من `monthly_income` + `monthly_expenses` (بدل `computeMonthlyData(income, expenses)`)
- حذف `useBeneficiariesSafe` (عدد المستفيدين متاح من `total_beneficiary_percentage` — أو يمكن إبقاء العدد ثابتاً في `overviewStats`)
- الاحتفاظ بـ: `useProperties`, `useContractsSafeByFiscalYear`, `useAllUnits`, `usePaymentInvoices`, `useContractAllocations`
- النتيجة: 5-6 طلبات بدل 11

---

## الخطوة 3: `usePropertiesViewData` — استبدال `useFinancialSummary` بـ `useAccountByFiscalYear`

**تعديل:** `src/hooks/page/admin/usePropertiesViewData.ts` سطر 11, 23
- حذف استيراد `useFinancialSummary`
- إضافة استيراد `useAccountByFiscalYear` من `@/hooks/financial/useAccounts`
- استبدال: `const { accounts } = useFinancialSummary(...)` بـ `const { data: accounts = [] } = useAccountByFiscalYear(fiscalYear?.label, fiscalYearId)`
- باقي الكود يبقى كما هو (يستخدم `accounts?.[0]`)

---

## الخطوة 4: تعزيز prefetch التقارير

**تعديل:** `src/hooks/data/core/usePrefetchPages.ts`

إضافة prefetch لـ `units` و `payment_invoices` داخل `prefetchReports`:
```typescript
const prefetchReports = useCallback(() => {
  prefetchProperties();
  prefetchFiscalYears();
  prefetchAccounts();
  // جديد: تحميل مسبق للوحدات والفواتير
  queryClient.prefetchQuery({
    queryKey: ['units'],
    staleTime: PREFETCH_STALE,
    queryFn: async () => { /* select from units */ },
  });
  queryClient.prefetchQuery({
    queryKey: ['payment_invoices', 'all'],
    staleTime: PREFETCH_STALE,
    queryFn: async () => { /* select from payment_invoices */ },
  });
}, [...]);
```

---

## الخطوة 5: تقليل DeferredRender في `BeneficiaryDashboard`

**تعديل:** `src/pages/beneficiary/BeneficiaryDashboard.tsx`
- سطر 112: `delay={800}` → `delay={300}`
- سطر 127: `delay={1200}` → `delay={500}`

---

## الخطوة 6: رفع `STALE_SETTINGS` إلى 5 دقائق

**تعديل:** `src/lib/queryStaleTime.ts` سطر 10:
- `export const STALE_SETTINGS = 60_000;` → `export const STALE_SETTINGS = 5 * 60_000;`

---

## ملخص التنفيذ

| # | الإجراء | الملفات | الأثر |
|---|---------|---------|-------|
| 1 | RPC متعدد السنوات + hook + تعديل useHistoricalComparison | 1 migration + 2 ملف | **عالي** |
| 2 | monthly_expenses في RPC + تحسين useWaqifDashboardPage | نفس migration + 2 ملف | **عالي** |
| 3 | usePropertiesViewData → useAccountByFiscalYear | 1 ملف | **متوسط** |
| 4 | تعزيز prefetch التقارير | 1 ملف | **متوسط** |
| 5 | تقليل DeferredRender | 1 ملف | **منخفض** |
| 6 | رفع STALE_SETTINGS | 1 ملف | **منخفض** |

**إجمالي:** 1 migration + ~8 ملفات كود

