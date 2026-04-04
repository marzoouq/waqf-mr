

# خطة تحسين الأداء — المرحلة الثانية

## نظرة عامة
5 تحسينات مستقلة: 2 تحسين في قاعدة البيانات (RPCs)، و3 تحسينات في الكود فقط.

---

## الخطوة 1: إنشاء RPC لمقارنة السنوات

**قاعدة بيانات — Migration جديد:**

إنشاء دالة `get_year_comparison_summary(p_year1_id uuid, p_year2_id uuid)` تُرجع jsonb:
- لكل سنة: `total_income`, `total_expenses`, `vat_amount`, `zakat_amount`, `admin_share`, `waqif_share`, `waqf_revenue`, `distributions_amount`, `net_after_expenses`, `net_after_vat`
- `monthly_income` و `monthly_expenses` لكل سنة (تجميع حسب `EXTRACT(MONTH FROM date)`)
- `expenses_by_type` لكل سنة (تجميع حسب `expense_type`)

**كود — ملفان:**
1. **ملف جديد:** `src/hooks/financial/useYearComparisonData.ts` — hook يستدعي الـ RPC ويُرجع البيانات بتنسيق متوافق مع المكون الحالي
2. **تعديل:** `src/components/reports/YearOverYearComparison.tsx` — استبدال `useFinancialSummary` × 2 بالـ hook الجديد، مع الحفاظ على نفس واجهة `comparisonData` و `yearTotals` و `expensesByType`

**النتيجة:** 10 استعلامات ← 1 RPC

---

## الخطوة 2: توسيع RPC المستفيد

**قاعدة بيانات — Migration جديد:**

تعديل `get_beneficiary_dashboard` لإضافة:
```sql
-- تجميع الإيرادات حسب المصدر
'income_by_source', (SELECT COALESCE(jsonb_agg(...), '[]') FROM (
  SELECT source, SUM(amount) as total FROM income WHERE fiscal_year_id = v_fy.id GROUP BY source
) ...)

-- تجميع المصروفات حسب النوع (باستبعاد الضريبة)
'expenses_by_type_excluding_vat', (SELECT COALESCE(jsonb_agg(...), '[]') FROM (
  SELECT expense_type, SUM(amount) as total FROM expenses
  WHERE fiscal_year_id = v_fy.id AND expense_type NOT IN ('ضريبة القيمة المضافة','vat','ضريبة قيمة مضافة')
  GROUP BY expense_type
) ...)
```

**كود — 5 ملفات:**

1. **تحديث واجهة:** `BeneficiaryDashboardData` في `useBeneficiaryDashboardData.ts` — إضافة `income_by_source` و `expenses_by_type_excluding_vat`

2. **تعديل 4 صفحات** لاستخدام بيانات الـ RPC بدل `useFinancialSummary`:
   - `useDisclosurePage.ts` — يحتاج `incomeBySource`, `expensesByTypeExcludingVat`, وبيانات مالية أساسية. كلها متاحة الآن من الـ RPC
   - `useAccountsViewPage.ts` — نفس الشيء
   - `useMySharePage.ts` — يحتاج أيضاً بيانات مالية تفصيلية + `incomeBySource`/`expensesByTypeExcludingVat`
   - `useFinancialReportsPage.ts` — يحتاج `income[]` الخام لحساب `monthlyData`. **ملاحظة:** الـ RPC لا يُرجع الإيرادات الخام. خياران:
     - (أ) إضافة `monthly_income` مُجمّع في الـ RPC (أفضل)
     - (ب) إبقاء `useIncomeByFiscalYear` فقط لهذه الصفحة

   سنستخدم الخيار (أ): إضافة `monthly_income` إلى الـ RPC (مصفوفة `[{month, total}]`).

**النتيجة:** أول زيارة لصفحة مستفيد: 6 طلبات ← 1 RPC

---

## الخطوة 3: تقليل delays في DeferredRender

**ملفان:**
- `src/pages/dashboard/AccountsPage.tsx`: تغيير (600, 900, 1200, 1500, 1800) → (100, 200, 300, 400, 500)
- `src/pages/beneficiary/WaqifDashboard.tsx`: تغيير (800, 1500, 2000) → (200, 400, 600)

---

## الخطوة 4: استبدال `transition-all` في المكونات المخصصة

**3 ملفات:**
- `src/pages/beneficiary/notifications/NotificationsList.tsx`: `transition-all` → `transition-colors`
- `src/components/layout/Sidebar.tsx`: `transition-all duration-200` → `transition-colors duration-200`
- `src/components/settings/BannerSettingsTab.tsx`: 3 مواقع `transition-all` → `transition-colors`

---

## الخطوة 5: تحسين جلب العقود في `useAccountsData`

**تعديل:** `src/hooks/financial/useAccountsData.ts`

حالياً: `useContractsByFiscalYear('all')` يجلب كل العقود (حتى 1000+) ثم يبني `allocationMap` في العميل.

**التغيير:**
- استبدال `useContractsByFiscalYear('all')` بـ `useContractsByFiscalYear(fiscalYearId)` (العقود المرتبطة بالسنة المحددة فقط)
- استخدام `useContractAllocations(fiscalYearId)` الموجود فعلاً في `src/hooks/financial/useContractAllocations.ts` لجلب التخصيصات من جدول `contract_fiscal_allocations` مباشرة — بدل حسابها في العميل
- بناء `allocationMap` من بيانات `contract_fiscal_allocations` بدل `useContractAllocationMap`
- العقود التي لها تخصيصات ولكن `fiscal_year_id` مختلف ستظهر عبر الـ join مع `contract_fiscal_allocations`

---

## ملخص التنفيذ

| # | الإجراء | النوع | الملفات |
|---|---------|-------|---------|
| 1 | RPC مقارنة السنوات | migration + 2 ملف | **عالي** |
| 2 | توسيع RPC المستفيد | migration + 5 ملفات | **عالي** |
| 3 | تقليل DeferredRender delays | 2 ملف | **متوسط** |
| 4 | استبدال transition-all | 3 ملفات | **منخفض** |
| 5 | تحسين جلب العقود | 1-2 ملف | **متوسط** |

**إجمالي:** 2 migrations + ~13 ملف كود

