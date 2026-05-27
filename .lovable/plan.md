# فحص جنائي للخطة — نتائج التحقق الفعلي

## القاعدة المرجعية: لا يُحذف من اللوحة إلا ما تأكد وجوده في صفحة اختصاصه

تم التحقق فعلياً من كل صفحة وجهة. النتائج أدناه **تُعدّل** الخطة السابقة، وليست تأكيداً أعمى لها.

---

## 1) Stats — التحقق الفعلي (13 بطاقة)


| #   | البطاقة                 | الوجهة        | موجودة هناك؟                                                     | القرار المصحَّح                   |
| --- | ----------------------- | ------------- | ---------------------------------------------------------------- | --------------------------------- |
| 1   | إجمالي العقارات         | Properties    | ✅ `PropertySummaryCards`                                         | **يبقى**                          |
| 2   | العقود النشطة           | Contracts     | ✅ `ContractStatsCards`                                           | **يبقى**                          |
| 3   | الإيرادات التعاقدية     | Contracts     | ✅ `ContractStatsCards` سطر 80                                    | **يُحذف من اللوحة**               |
| 4   | إجمالي الدخل الفعلي     | Income        | ✅                                                                | **يبقى** (YoY)                    |
| 5   | إجمالي المصروفات        | Expenses      | ✅ `ExpenseSummaryCards`                                          | **يبقى** (YoY)                    |
| 6   | صافي الريع              | Accounts      | ✅ `AccountsDistributionTable`                                    | **يبقى**                          |
| 7   | المتاح للتوزيع          | Distributions | ✅ سطر 58                                                         | **يُحذف من اللوحة**               |
| 8   | حصة الناظر (admin-only) | Accounts      | ✅ `AccountsSummaryCards` + `AccountsDistributionTable`           | **يُحذف من اللوحة**               |
| 9   | حصة الواقف (admin-only) | Accounts      | ✅ نفس المكان                                                     | **يُحذف من اللوحة**               |
| 10  | ريع الوقف (admin-only)  | Distributions | ✅ سطر 64 + `AccountsSummaryCards`                                | **يُحذف من اللوحة**               |
| 11  | المستفيدون النشطون      | Beneficiaries | ✅                                                                | **يبقى**                          |
| 12  | التدفق النقدي الصافي    | Accounts      | ⚠️ غير ظاهر كبطاقة مستقلة — موجود في `useAdminDashboardData` فقط | **يبقى على اللوحة** (لا بديل بعد) |
| 13  | نسبة التوزيع الفعلي     | Distributions | ❌ **غير موجودة**                                                 | **مُحتجز — يبقى مؤقتاً**          |


**نتيجة جنائية:** 4 بطاقات تُحذف بأمان فقط (#3, #7, #8, #9, #10). البطاقة #13 لا يجوز حذفها قبل إضافتها لـ DistributionsPage.

---

## 2) KPIs — التحقق الفعلي (4 مؤشرات)


| #   | KPI            | الوجهة                          | موجود؟                                                           | القرار المصحَّح          |
| --- | -------------- | ------------------------------- | ---------------------------------------------------------------- | ------------------------ |
| 1   | نسبة التحصيل   | يبقى في `CollectionSummaryCard` | ✅ موجودة                                                         | **يُحذف من KpiPanel**    |
| 2   | معدل الإشغال   | Properties                      | ✅ `PropertySummaryCards` سطر 77-80 (شريط Progress)               | **يُحذف من KpiPanel**    |
| 3   | متوسط الإيجار  | Properties                      | ❌ **غير موجود**                                                  | **مُحتجز — يبقى مؤقتاً** |
| 4   | نسبة المصروفات | Expenses                        | ❌ **غير موجود** (الموجود: نسبة التوثيق، متوسط المصروف، أعلى نوع) | **مُحتجز — يبقى مؤقتاً** |


**نتيجة جنائية:** لا يمكن حذف `DashboardKpiPanel` بالكامل بأمان. KPIs #3 و#4 ليس لهما بديل في صفحات الاختصاص.

---

## 3) فحص لوحة المحاسب (`AccountantDashboardView`)


| البطاقة                                     | المصدر   | تكرار مع AdminDashboard؟ |
| ------------------------------------------- | -------- | ------------------------ |
| 5 بطاقات تشغيلية (فواتير معلّقة/متأخرة/إلخ) | hook خاص | ❌ مستقلة                 |
| التحصيل اليومي + المصروفات الشهرية          | hook خاص | ❌ مستقلة                 |


لا تغيير. الفلتر `accountant-dashboard-filtering` يجب أن يبقى كطبقة دفاع لأن stats الجديدة قد تحمل `visibility: 'admin-only'` مستقبلاً.

---

## 4) لوحة الواقف — التحقق

`WaqifFinancialSection.tsx` سطر 76-87 يعرض:

- إجمالي الدخل ← مكرر مع `AnnualDisclosureTable` + Reports ✅
- إجمالي المصروفات ← مكرر ✅
- الريع القابل للتوزيع ← مكرر ✅

`useWaqifDashboardPage.ts` سطر 79-80 يحسب `معدل الإشغال` + `نسبة المصروفات` كـ KPIs — **يبقى** (الناظر يتحكم به عبر `app_settings`).

`WaqifFinancialSection` props غير مستخدمة بعد الحذف: `totalIncome`, `totalExpenses`, `availableAmount`, `isFiscalYearActive` → حذف من التواقيع و hook.

---

# الخطة المصحَّحة (مرحلتان: حماية ثم تنظيف)

## المرحلة 0 — سدّ الثغرات قبل الحذف (إضافات إلزامية)

تُضاف 3 بطاقات للوجهات قبل أي حذف:

1. `**PropertySummaryCards**`: إضافة بطاقة "متوسط الإيجار" (موجود في `usePropertiesSummary` كحساب أو نضيفه: contractualRevenue / totalRented)
2. `**ExpenseSummaryCards**`: إضافة بطاقة "نسبة المصروفات إلى الدخل" (من `useExpensesPage` — قراءة `expenseRatio` من `useAdminDashboardData` أو حسابها محلياً)
3. `**DistributionsPage**`: إضافة بطاقة "نسبة التوزيع الفعلي" (distributed/available×100) — توسعة الشبكة من 4 إلى 5 بطاقات

## المرحلة 1 — Wave D: تنظيف لوحة الناظر

- `useAdminDashboardStats.ts`: حذف 5 stats (#3, #7, #8, #9, #10, #13) → **6 بطاقات محذوفة**، 7 تبقى
  - الباقي: إجمالي العقارات، العقود النشطة، الدخل، المصروفات، صافي الريع، المستفيدون، التدفق النقدي
- `useAdminDashboardStats.ts`: حذف 3 KPIs (#2, #3, #4) → 1 يبقى (نسبة التحصيل)
- `AdminDashboard.tsx`: حذف استيراد + استخدام `DashboardKpiPanel` (نسبة التحصيل تظهر في `CollectionSummaryCard`)

## المرحلة 2 — Wave F: تنظيف لوحة الواقف

- `WaqifFinancialSection.tsx`: حذف كتلة "التسلسل المالي" (سطور 68-89)
- إضافة شريط إرشادي مع رابط `/dashboard/reports`
- تنظيف props غير المستخدمة في `WaqifFinancialSection` + `useWaqifDashboardPage`

## المرحلة 3 — توثيق وتحقق

- تحديث `mem://business-logic/dashboards/role-data-consistency-standard`
- اختبار يدوي: لوحة ناظر / محاسب / واقف / مستفيد + صفحات Properties / Expenses / Distributions

---

# جدول التغيير الإجمالي


| فعل                                  | عدد البطاقات                               |
| ------------------------------------ | ------------------------------------------ |
| يُضاف (وجهات)                        | 3                                          |
| يُحذف من لوحة الناظر (Stats)         | 5                                          |
| يُحذف من لوحة الناظر (KPIs)          | 3                                          |
| يُحذف كومبوننت كامل                  | 1 (`DashboardKpiPanel` استخدام)            |
| يُحذف من لوحة الواقف                 | 3 (كتلة التسلسل المالي)                    |
| يُدمج                                | 1 (نسبة التحصيل ← `CollectionSummaryCard`) |
| يُرحَّل (يبقى مؤقتاً لحين توفر بديل) | 0 بعد المرحلة 0                            |


---

# الملفات المتأثرة

```
[المرحلة 0 — إضافات]
src/components/properties/PropertySummaryCards.tsx          (+ بطاقة متوسط الإيجار)
src/hooks/page/admin/properties/usePropertiesSummary.ts     (+ avgRent إذا غير موجود)
src/components/expenses/ExpenseSummaryCards.tsx             (+ بطاقة نسبة المصروفات)
src/hooks/page/admin/financial/useExpensesPage.ts           (+ expenseRatio prop)
src/pages/dashboard/DistributionsPage.tsx                   (+ بطاقة نسبة التوزيع)
src/hooks/page/admin/financial/useDistributionsPage.ts      (+ distributionRatio)

[المرحلة 1 — حذف من اللوحة]
src/hooks/page/admin/dashboard/useAdminDashboardStats.ts    (− 5 stats + 3 kpis)
src/pages/dashboard/AdminDashboard.tsx                      (− DashboardKpiPanel)

[المرحلة 2 — تنظيف الواقف]
src/components/waqif/WaqifFinancialSection.tsx              (− كتلة التسلسل + شريط رابط)
src/hooks/page/waqif/useWaqifDashboardPage.ts               (− props غير مستخدمة)

[المرحلة 3]
mem://business-logic/dashboards/role-data-consistency-standard
```

---

# ضمانات السلامة (محدّثة)

- ✅ بلا تغيير في DB/RPC/RLS/ZATCA
- ✅ بلا تغيير في `AccountantDashboardView` و `BeneficiaryDashboard`
- ✅ **كل بطاقة محذوفة تأكدت وجود بديل لها** (بعد المرحلة 0)
- ✅ `accountant-dashboard-filtering` يبقى كطبقة دفاع
- ✅ `public-stats-anonymization` للواقف غير متأثر
- ✅ ترتيب المراحل (0 → 1 → 2) يضمن عدم وجود لحظة "بيانات مفقودة"

---

# قرار مطلوب

اعتمد الخطة بترتيبها (0 → 1 → 2) أو حدد:

- هل أُضيف **بطاقة "متوسط الإيجار"** فعلاً لـ Properties، أم أكتفي بحذفها من الناظر دون بديل؟
- هل تريد بطاقة **"نسبة المصروفات"** في Expenses أم تكتفي بـ Alerts الموجود؟
- هل تريد بطاقة **"نسبة التوزيع الفعلي"** في Distributions أم تكتفي بصفحة Beneficiaries؟  
  
القرار   
بلا تغيير نسبة المصروفات 