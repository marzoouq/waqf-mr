
# الخطة المنقّحة — نسخة 2 (بعد الفحص الإضافي للمحاسب والمستفيد والواقف)

## أولاً — الفروقات الجوهرية بين النسخة 1 والنسخة 2

| البند | النسخة 1 (السابقة) | النسخة 2 (هذه) |
|---|---|---|
| نطاق التعديل | لوحة الناظر فقط (20 صفحة) | الناظر + المحاسب + المستفيد + الواقف (مسار واحد للحقيقة عبر الأدوار) |
| إصلاح "الإيرادات التعاقدية" | اقتراح تجريدي بـ "توحيد مع Properties" | اعتماد `computeContractualRevenue` الموجود + تغذيته بـ `useContractAllocations`. **حذف `useContractAllocationMap` المعيب** وتحديث كل مستهلكيه |
| لوحة المحاسب | لم تُذكر تأثيرات صريحة | محدّدة بدقة: حذف بطاقات الحصص لا يضرّه؛ `AccountantDashboardView` يبقى كما هو |
| لوحة المستفيد | لم تُمسّ | `PropertiesViewPage` يعاني من نفس مشكلة Properties → نفس التنظيف. `DisclosureFinancialStatement` يحتاج تصحيح تسمية "المحصّل" |
| لوحة الواقف | لم تُمسّ | لا تعديل مطلوب — يستهلك `computeContractualRevenue` بالفعل ✓ |
| Risk على RPC | لا تغيير على RPC | لا تغيير على RPC (مؤكد). `dashboard-summary` يبقى مصدر لوحة التحكم |
| Risk على Tests | اختبارات Properties + Distributions فقط | + اختبار جديد لـ `PropertiesViewPage` (المستفيد) + اختبار `DisclosureFinancialStatement` للتسمية |

---

## ثانياً — ما اكتُشف في الفحص الإضافي

### اكتشاف 1 — `computeContractualRevenue` موجود ومُختبر بالفعل
- ملف نقي في `src/utils/financial/computeContractualRevenue.ts` مع `.test.ts` يطابق منطق RPC حرفياً:
  - أولوية 1: `Σ allocations.allocated_amount`
  - أولوية 2 (fallback): `Σ contracts.rent_amount` للعقود المرشّحة لنفس السنة فقط
- يستخدمه `useWaqifDashboardPage` ✓
- **لا يستخدمه** `usePropertiesSummary` (الناظر) ولا `useReportsData` (التقارير) ولا `usePropertiesViewPage` (المستفيد) — هؤلاء يستهلكون `useContractAllocationMap` الذي يبني خريطة عبر `allocateContractToFiscalYears` (حساب خطي بأشهر تقويمية). **هذا هو السبب الجذري لـ 8100 vs 9450**.

### اكتشاف 2 — جانب المستفيد يكرّر نفس الفخ
- `usePropertiesViewPage` يحوي `summaryData` بنفس الحقول الأربعة المالية (`contractualRevenue`, `activeIncome`, `totalExpensesAll`, `netIncome`) ونفس فلتر `e.property_id` على المصروفات → نفس الانحراف بين عرض المستفيد للعقارات والتقارير الرسمية.
- `DisclosurePage` للمستفيد يعرض `DisclosureFinancialStatement` (نظير `AnnualDisclosureTable` للناظر). تصحيح التسمية يجب أن يطبَّق على كليهما حتى لا يقرأ المستفيد "إيرادات محصّلة" زائفة.
- `MySharePage`, `AccountsViewPage`, `CarryforwardHistoryPage`, `InvoicesViewPage`, `ContractsViewPage`, `ExpensesViewPage` — كلها قراءة فقط ولا تكرر بطاقات الناظر.

### اكتشاف 3 — لوحة المحاسب جزء من `AdminDashboard`
- المحاسب يدخل نفس `/dashboard` ويرى:
  1. `DashboardStatsGrid` (مع حجب `admin-only` على حصص الناظر/الواقف/الريع).
  2. `DashboardKpiPanel` (نسبة التحصيل/الإشغال/متوسط الإيجار/نسبة المصروفات).
  3. `AccountantDashboardView` إضافي (5 metric cards: متأخرة/معلقة/المُحصّل/ZATCA/يتيمة + جدولان).
- حذف بطاقات الحصص من `useAdminDashboardStats` لا يؤثر عليه (محجوبة أصلاً).
- `AccountantDashboardView` يبقى كما هو — يعرض ما يخص المحاسب حصراً.

### اكتشاف 4 — لوحة الواقف سليمة
- `WaqifDashboard` يعرض overview (4 بطاقات) + financial section (KPIs + contractual) + charts. مصدر contractualRevenue صحيح (`computeContractualRevenue`). **لا تعديل**.

---

## ثالثاً — ماذا يبقى، ماذا يُحذف، ماذا يُدمج، ماذا يُضاف (مصفوفة جوهرية)

### مجموعة الناظر (admin/accountant)

| الصفحة | يبقى | يُحذف | يُدمج/يُنقل | يُضاف |
|---|---|---|---|---|
| **AdminDashboard** | عقارات/عقود نشطة/فواتير متأخرة/المستفيدين النشطين/الإيرادات التعاقدية/الدخل الفعلي/المصروفات/صافي الريع + Heatmap + Pending + Recent + Charts + AccountantDashboardView (للمحاسب) | بطاقات: حصة الناظر · حصة الواقف · ريع الوقف · المتاح للتوزيع · التدفق النقدي الصافي · نسبة التوزيع الفعلي. KPI: متوسط الإيجار · نسبة المصروفات | الحصص/الريع → AccountsPage و DistributionsPage حصراً. متوسط الإيجار → ContractsPage. نسبة المصروفات → ReportsPage | بطاقة سريعة "متاح للتوزيع" تفتح DistributionsPage (رابط فقط، رقم مختصر) |
| **PropertiesPage** | الصف العلوي 4 بطاقات تشغيلية + شريط الإشغال + الجدول/الكروت | الصف المالي الكامل (الإيرادات التعاقدية/المحصّل/المصروفات/صافي) — موجود في صفحات أخرى | تفاصيل العقار المالية تبقى في drill-down داخل `PropertyCard` فقط | — |
| **ContractsPage** | 5 بطاقات + تبويب العقود + تبويب الاستحقاقات | تبويب "فواتير الدفعات" + تبويب "تقرير التحصيل" | تبويب الفواتير → روابط إلى InvoicesPage (filter=rent). تقرير التحصيل → IncomePage كتبويب جديد | KPI صغير "متوسط الإيجار" (منقول من Dashboard) |
| **IncomePage** | بطاقاتها الأربع الحالية | — | استقبال "تقرير التحصيل" المنقول من Contracts كتبويب | بطاقة "المحصّل فعلياً" مستقلة (`payment_invoices.paid_amount`) بجانب "الدخل المسجّل" مع توضيح الفرق |
| **ExpensesPage** | بدون تغيير وظيفي | — | — | فتح بصرياً علاقة "ميزانية مقابل فعلي" أوضح (تحسين بصري لـ `ExpenseBudgetBar`) |
| **InvoicesPage** | بدون تغيير معماري | تناقض عداد "إجمالي الفواتير" | — | عداد الإجمالي يحسب على `unifiedInvoices` ليطابق tab الكل |
| **ReportsPage** | كل التبويبات الحالية | — | KPI "نسبة المصروفات" المنقولة من Dashboard تصبح بطاقة هنا | جدول الإفصاح: صف فرعي "منه: محصّل من فواتير الدفع" + تصحيح تسمية صف الإجمالي إلى "إجمالي الدخل المسجّل دفتراً" |
| **AccountsPage** | 14 بطاقة + كل الجداول + إقفال السنة | — | — | بطاقة إشارية أعلى الصفحة "هذه الصفحة هي مصدر الحقيقة لحصص الناظر/الواقف/الريع" |
| **DistributionsPage** | كل البطاقات + جدول التوزيع + زر التنفيذ | منطق `canDistribute` العبثي | — | منطق `canDistribute` صحيح: `role==='admin' && currentAccount && availableAmount>0 && beneficiaries.length>0 && !isClosed` |
| **BeneficiariesPage** | بدون تغيير | — | — | — |
| **ChartOfAccountsPage** | بدون تغيير | — | — | — |
| **HistoricalComparisonPage** | بدون تغيير | — | — | — |
| **AnnualReportPage / BylawsPage / MessagesPage / SupportDashboard / AuditLog / Zatca / Diagnostics / EmailMonitor / UserManagement / Settings** | كلها بدون تغيير | — | — | — |

### مجموعة المستفيد (beneficiary)

| الصفحة | يبقى | يُحذف | يُدمج | يُضاف |
|---|---|---|---|---|
| **BeneficiaryDashboard** | كل الـ widgets الحالية (welcome/stats/quick links/distributions/notifications/advance) | — | — | — |
| **PropertiesViewPage** | البطاقات التشغيلية فقط (إجمالي/مؤجرة/شاغرة + إشغال) | الحقول المالية في `summaryData`: contractualRevenue/activeIncome/totalExpensesAll/netIncome | drill-down يبقى داخل بطاقة العقار | — |
| **DisclosurePage** + `DisclosureFinancialStatement` | كل صفوف التسلسل المالي | تسمية "إجمالي الإيرادات المحصّلة" | — | تصحيح التسمية إلى "إجمالي الدخل المسجّل دفتراً" + صف فرعي "منه: محصّل من فواتير الدفع" — نفس التعديل المطبَّق على الناظر |
| **MySharePage / AccountsViewPage / CarryforwardHistoryPage / InvoicesViewPage / ContractsViewPage / ExpensesViewPage / FinancialReportsPage / AnnualReportViewPage / BylawsViewPage / SupportPage / NotificationsPage / BeneficiarySettings / BeneficiaryMessages** | كلها بدون تغيير | — | — | — |

### مجموعة الواقف (waqif)

| الصفحة | يبقى | يُحذف | يُدمج | يُضاف |
|---|---|---|---|---|
| **WaqifDashboard** | كل ما فيها — يستهلك `computeContractualRevenue` بالفعل | — | — | — |

---

## رابعاً — مصدر واحد للحقيقة (نهائي)

```text
نوع الرقم               → مصدر وحيد (مُطبَّق على كل الأدوار)
──────────────────────────────────────────────────────────
إيراد متوقع/تعاقدي       → computeContractualRevenue(contracts, useContractAllocations(fyId))
دخل دفتري                → income table sum
محصّل فعلياً              → payment_invoices.paid_amount (status ∈ paid|partially_paid)
مصروفات إجمالية          → expenses table sum (لا فلتر property_id)
مصروفات عقار محدد        → computePropertyFinancials (موجود)
نسبة التحصيل             → summarizePaymentInvoices(payment_invoices) — دالة واحدة
حصص الناظر/الواقف/الريع  → useComputedFinancials (Reports + Accounts + Distributions + Disclosure للمستفيد)
عداد المستفيدين          → نفس مصدر RPC في الـ Dashboard وقاعدة beneficiaries في BeneficiariesPage
```

`useContractAllocationMap` يُحذف ويُحال كل مستهلكيه إلى `computeContractualRevenue` + `useContractAllocations`.

---

## خامساً — الإصلاحات الكودية الجوهرية (مرتبة حسب الأولوية)

| # | الملف | التعديل | تأثير |
|---|---|---|---|
| 1 | `src/hooks/page/admin/financial/useDistributionsPage.ts` | إضافة `canDistribute` صحيح وتمريره للصفحة | يمنع توزيعاً في سنة مقفلة |
| 2 | `src/pages/dashboard/DistributionsPage.tsx` | استبدال التعبير الثلاثي العبثي بـ `p.canDistribute` | UX سليم |
| 3 | `src/hooks/page/admin/properties/usePropertiesSummary.ts` | استبدال `useContractAllocationMap` بـ `useContractAllocations(fyId) + computeContractualRevenue` للداخل (يُستخدم في drill-down)، **وإزالة حقول summary المالية** (contractualRevenue/activeIncome/collectedIncome/totalExpensesAll/netIncome) | تطابق Properties مع Contracts + إزالة التكرار |
| 4 | `src/components/properties/PropertySummaryCards.tsx` | إزالة الصف المالي الثاني — الإبقاء على التشغيلي فقط | واجهة نظيفة |
| 5 | `src/hooks/page/beneficiary/views/usePropertiesViewPage.ts` | نفس تنظيف #3 (إزالة حقول summary المالية + استخدام `computeContractualRevenue`) | تطابق المستفيد مع التقارير الرسمية |
| 6 | `src/components/beneficiary/...PropertiesViewSummary` | إزالة بطاقات المالي من الصفحة العامة للعقارات | — |
| 7 | `src/hooks/page/admin/reports/useReportsData.ts` | استبدال `useContractAllocationMap` بـ `useContractAllocations + computeContractualRevenue` لتغذية `usePropertyPerformance` | تطابق التقارير |
| 8 | `src/hooks/domain/financial/useContractAllocationMap.ts` | **حذف الملف** بعد إفراغ مستهلكيه (#3, #5, #7) | إزالة fallback خطي معيب |
| 9 | `src/components/reports/AnnualDisclosureTable.tsx` | إعادة تسمية صف "إجمالي الإيرادات المحصّلة" إلى "إجمالي الدخل المسجّل دفتراً" + صف فرعي اختياري "منه: محصّل من فواتير الدفع" | تقرير الإفصاح يطابق المعنى المحاسبي |
| 10 | `src/components/beneficiary/disclosure/DisclosureFinancialStatement.tsx` | تطبيق نفس تعديل #9 على عرض المستفيد | اتساق عبر الأدوار |
| 11 | `src/hooks/page/admin/dashboard/useAdminDashboardStats.ts` | إزالة بطاقات: حصة الناظر، حصة الواقف، ريع الوقف، المتاح للتوزيع، التدفق النقدي، نسبة التوزيع. إزالة KPI: متوسط الإيجار، نسبة المصروفات. الإبقاء على: العقارات/العقود النشطة/الإيرادات التعاقدية/الدخل/المصروفات/صافي الريع/المستفيدين + KPI نسبة التحصيل ومعدل الإشغال | لوحة موجزة فعلاً، الحصص في AccountsPage |
| 12 | `src/pages/dashboard/AdminDashboard.tsx` | إضافة بطاقة سريعة "متاح للتوزيع" مع رابط `/dashboard/distributions` (رقم بدون تفاصيل) | لا يفقد المستخدم رابطاً سريعاً |
| 13 | `src/pages/dashboard/ContractsPage.tsx` | إزالة `TabsTrigger value="invoices"` و `value="collection"`. الإبقاء على contracts + accruals فقط. روابط بدلاً منها أعلى الصفحة | فصل اختصاص |
| 14 | `src/pages/dashboard/IncomePage.tsx` | استقبال تبويب "تقرير التحصيل" المنقول | تجميع المحاسبي في صفحة الدخل |
| 15 | `src/components/contracts/ContractStatsCards.tsx` | إضافة بطاقة "متوسط الإيجار" (منقول من Dashboard KPI) | KPI عقدي في صفحته |
| 16 | `src/components/reports/ReportsSummaryCards.tsx` | إضافة بطاقة "نسبة المصروفات" (منقول من Dashboard KPI) | KPI تقريري في صفحته |
| 17 | `src/components/invoices/InvoiceSummaryCards.tsx` | استقبال `unifiedInvoices` بدل `invoices` لبطاقة الإجمالي | تطابق العداد مع الجدول |
| 18 | `src/components/dashboard/charts/IncomeMonthlyChart.tsx` | تبسيط: "نسبة الإنجاز" (مقيدة 100%) + سطر فرعي مستقل "فائض: +X ر.س" — حذف عبارة "+X% تحصيل زائد" | إزالة التضليل |

---

## سادساً — الأثر الأمني والصلاحيات (مؤكَّد)

- **المحاسب**: لا يفقد شيئاً (الحصص محجوبة عنه أصلاً). البطاقات المنقولة إلى صفحات الاختصاص محمية بنفس RLS.
- **المستفيد**: لا يكتسب أي وصول جديد. تنظيف PropertiesViewPage يقلّل الانكشاف لأنه يحذف أرقاماً مكررة، لا يضيف حقولاً جديدة.
- **الواقف**: لا تعديل.
- **DistributionsPage**: حماية فعلية مضافة على الزر — لا تأثير على RLS لكنه يمنع طلب RPC في حالات غير صالحة.

---

## سابعاً — التحقق بعد التنفيذ (Checklist إلزامي)

1. سنة 2025-2026: مقارنة "الإيرادات التعاقدية" بين ContractsPage و WaqifDashboard و (إن بقيت) Dashboard → رقم واحد، 8100 (لا 9450).
2. PropertiesPage بلا أي رقم مالي — تشغيلي فقط.
3. PropertiesViewPage للمستفيد بلا أي رقم مالي.
4. DistributionsPage: زر التنفيذ معطّل تماماً في سنة مقفلة وللمحاسب.
5. AnnualDisclosureTable + DisclosureFinancialStatement: نفس التسمية الجديدة في الناظر والمستفيد.
6. InvoicesPage tab "الكل": عداد الإجمالي = عدد الصفوف المعروضة.
7. AdminDashboard: لا تظهر بطاقات الحصص للناظر أيضاً (موحّد عبر الأدوار).
8. IncomePage يحتوي تبويب "تقرير التحصيل" المنقول.
9. ContractsPage لا يحتوي تبويب فواتير الدفعات/تقرير التحصيل.
10. اختبارات: `computeContractualRevenue.test.ts` يمر؛ تُحدَّث اختبارات `usePropertiesSummary` و `usePropertiesViewPage` و `useDistributionsPage` لتعكس واجهة الإرجاع الجديدة.

---

## ثامناً — ما لا تُغيِّره هذه الخطة (ضمانات)

- لا تعديل على قاعدة البيانات، RLS، أو RPC.
- لا تعديل على edge functions (`dashboard-summary`, `beneficiary-summary`, ZATCA, إلخ).
- لا تغيير في طبقة `hooks/data` (queries خام) — التعديل في `hooks/page` و `components` فقط، باستثناء حذف `hooks/domain/financial/useContractAllocationMap.ts` (طبقة domain).
- لا تعديل على ملفات `client.ts`, `types.ts`, `config.toml`, `.env`.

---

## تاسعاً — تسلسل التنفيذ الموصى به (موجات صغيرة قابلة للمراجعة)

1. **موجة A (إصلاحات حرجة آمنة)**: #1, #2 (Distributions bug), #9, #10 (تسمية الإفصاح), #17 (Invoices counter), #18 (Income chart).
2. **موجة B (توحيد الإيرادات التعاقدية)**: #3, #5, #7, ثم #8 (حذف `useContractAllocationMap`).
3. **موجة C (تنظيف Properties)**: #4, #6.
4. **موجة D (إعادة توزيع Dashboard)**: #11, #12, #15, #16.
5. **موجة E (إعادة توزيع Contracts → Income)**: #13, #14.

كل موجة قابلة للمراجعة منفصلة قبل الانتقال للتالية.

---

اعتمد هذه الخطة بصيغتها الكاملة، أو حدّد أي موجة تريد البدء بها أولاً، أو أي بند تريد تعديله قبل التنفيذ.
