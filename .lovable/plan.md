

# الفحص الجنائي النهائي — لوحة الناظر بجميع أقسامها

---

## خريطة أقسام لوحة الناظر (20 صفحة)

```text
القائمة الجانبية (allAdminLinks):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
الرئيسية ────────── AdminDashboard (467 سطر)
العقارات ────────── PropertiesPage (424 سطر)
العقود ──────────── ContractsPage (632 سطر) [4 تبويبات]
الدخل ──────────── IncomePage
المصروفات ────────── ExpensesPage
المستفيدين ────────── BeneficiariesPage
التقارير ────────── ReportsPage (699 سطر) [8 تبويبات]  ← أكبر ملف
الحسابات ────────── AccountsPage
إدارة المستخدمين ── UserManagementPage
الإعدادات ────────── SettingsPage
المراسلات ────────── MessagesPage
الفواتير ────────── InvoicesPage
سجل المراجعة ────── AuditLogPage
اللائحة ────────── BylawsPage
إدارة ZATCA ────── ZatcaManagementPage
الدعم الفني ────── SupportDashboardPage
التقرير السنوي ──── AnnualReportPage (321 سطر)      ← مكرر جزئياً
الشجرة المحاسبية ── ChartOfAccountsPage
المقارنة التاريخية ── HistoricalComparisonPage (297 سطر) ← مكرر
تشخيص النظام ────── SystemDiagnosticsPage
واجهة المستفيد ──── رابط خارجي
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## التناقض #1 (حرج): الإشغال في الرئيسية يفلتر `active` فقط

**الملف:** `AdminDashboard.tsx` سطور 218-222

```typescript
contracts.filter(c => c.status === 'active' && c.unit_id)
contracts.filter(c => c.status === 'active' && !c.unit_id)
```

في سنة مقفلة → جميع العقود `expired` → KPI الإشغال = **0%**

**المقارنة:** `PropertiesPage.tsx` سطر 173 يستخدم `(isSpecificYear || c.status === 'active')` في حساب الإشغال الفردي لكل عقار — لكن البطاقات العلوية (سطر 72) تفلتر `active` فقط. **تناقض داخلي في نفس الصفحة.**

---

## التناقض #2 (حرج): الإيرادات التعاقدية في الرئيسية = `active` فقط

**الملف:** `AdminDashboard.tsx` سطر 116-118

```typescript
const activeContracts = contracts.filter(c => c.status === 'active');
const contractualRevenue = activeContracts.reduce(...)
```

في سنة مقفلة → بطاقة "الإيرادات التعاقدية" = **0 ر.س** رغم وجود عقود تاريخية.

---

## التناقض #3 (متوسط): `PropertiesPage` بطاقات الملخص — `active` فقط للإشغال العام

**الملف:** `PropertiesPage.tsx` سطور 72-73

البطاقات العلوية (`PropertySummaryCards`) تفلتر `active` فقط، بينما بطاقات العقارات الفردية (سطر 173) تستخدم `isSpecificYear`. **نتيجة:** البطاقة العلوية تقول "إشغال 0%" لكن كل عقار يظهر إشغاله الصحيح.

---

## التناقض #4 (متوسط): `PropertiesPage` الدخل النشط — `active` فقط حتى في سنة محددة

**الملف:** `PropertiesPage.tsx` سطر 102

```typescript
activeIncome = contracts.filter(c => c.status === 'active').reduce(...)
```

في سنة مقفلة محددة بحساب ختامي، يستخدم الحساب الختامي ✅. لكن في سنة **مفتوحة محددة** لا يوجد حساب ختامي — فيفلتر `active` فقط ويتجاهل عقوداً `expired` تنتمي لهذه السنة.

---

## التناقض #5 (متوسط): تكرار وظيفي بين 3 صفحات

```text
صفحة التقارير (ReportsPage) تحتوي:
├─ تبويب "مقارنة سنوية" ← نسخة من YearOverYearComparison
│   ↕ مكرر تماماً مع:
├─ صفحة "المقارنة التاريخية" (HistoricalComparisonPage)
│   → تعرض نفس YearOverYearComparison + جدول مقارنة + رسم
│
├─ تبويب "التقارير المالية" ← إفصاح سنوي + توزيع حصص + رسوم
│   ↕ يتداخل جزئياً مع:
└─ صفحة "التقرير السنوي" (AnnualReportPage)
    → CRUD لعناصر التقرير + ملخص تلقائي + مقارنة دخل + نشر
```

**التشتت للمستخدم:**
- "التقارير" في القائمة → 8 تبويبات ضخمة (699 سطر)
- "المقارنة التاريخية" في القائمة → صفحة مستقلة لنفس الوظيفة
- "التقرير السنوي" في القائمة → صفحة مختلفة لكن بها عناصر مكررة

المستخدم يبحث عن "المقارنة بين السنوات" ولا يعرف: هل يذهب للتقارير أم للمقارنة التاريخية؟

---

## التناقض #6 (متوسط): الفواتير مقسمة على مكانين

```text
/dashboard/invoices → فواتير عامة (مشتريات/مصروفات)
/dashboard/contracts → تبويب "فواتير الدفعات" → فواتير الإيجار
```

المستخدم يبحث عن "فاتورة إيجار" في صفحة الفواتير → لا يجدها. يجب الذهاب للعقود → تبويب الفواتير.

---

## التناقض #7 (منخفض): `collectionSummary` في الرئيسية يفلتر `active || expired`

**الملف:** `AdminDashboard.tsx` سطر 122

```typescript
contracts.filter(c => c.status === 'active' || c.status === 'expired')
```

هذا **صحيح** — يشمل العقود المنتهية. لكنه يتناقض مع الإشغال (سطر 218) الذي يفلتر `active` فقط. **تناقض داخلي:** التحصيل يحسب فواتير عقود منتهية لكن الإشغال يتجاهلها.

---

## التناقض #8 (منخفض): `monthlyData` مكرر حرفياً

**الملفات:**
- `AdminDashboard.tsx` سطور 186-205
- `WaqifDashboard.tsx` سطور 119-130 (مكرر)

نفس الحلقة: `income.forEach` + `expenses.forEach` → مصفوفة شهرية. مكرر بالحرف.

---

## ملخص البطاقات المكررة عبر صفحات الناظر

| البطاقة | الرئيسية | العقارات | التقارير (بطاقات) | التقارير (أداء) |
|---------|:--------:|:--------:|:-----------------:|:---------------:|
| إجمالي العقارات | ✅ | ✅ | ✅ | — |
| الإيرادات التعاقدية | ✅ | ✅ | — | ✅ (annualRent) |
| إجمالي الدخل | ✅ | ✅ | ✅ | — |
| إجمالي المصروفات | ✅ | ✅ | ✅ | ✅ |
| صافي الريع | ✅ | ✅ | ✅ | ✅ |
| نسبة الإشغال | ✅ KPI | ✅ شريط | — | ✅ عمود |

---

## خطة الإصلاح

### المرحلة 1: إصلاح تناقضات الفلترة (التناقضات 1-4, 7)

**القاعدة الموحدة** لجميع الملفات:
```text
const relevantContracts = isSpecificYear
  ? contracts  // كل العقود المرتبطة بالسنة (بما فيها expired)
  : contracts.filter(c => c.status === 'active');
```

| الملف | السطور | التغيير |
|-------|--------|---------|
| `AdminDashboard.tsx` | 116 | `activeContracts` → استخدام `isSpecificYear` |
| `AdminDashboard.tsx` | 218-222 | KPI الإشغال → `isSpecificYear` |
| `PropertiesPage.tsx` | 72-73 | البطاقات العلوية → `isSpecificYear` |
| `PropertiesPage.tsx` | 102 | `activeIncome` → `isSpecificYear` |

**إضافة `isSpecificYear` في `AdminDashboard`:**
```typescript
const isSpecificYear = fiscalYearId !== 'all' && !!fiscalYearId;
```

### المرحلة 2: توحيد المنطق المكرر

| الملف الجديد | الدوال | يستبدل |
|-------------|--------|--------|
| `src/utils/dashboardComputations.ts` | `computeMonthlyData(income, expenses)` | AdminDashboard سطور 186-205, WaqifDashboard سطور 119-130 |
| (نفس الملف) | `computeCollectionSummary(contracts, invoices)` | AdminDashboard سطور 120-140, WaqifDashboard سطور 74-92 |
| (نفس الملف) | `computeOccupancy(contracts, units, isSpecificYear)` | AdminDashboard سطور 218-228, PropertiesPage سطور 72-87 |

### المرحلة 3: لا دمج صفحات — توحيد كود فقط

الصفحات الثلاث (التقارير، المقارنة التاريخية، التقرير السنوي) تبقى منفصلة لأن:
- **التقارير** = عرض تحليلي شامل (8 تبويبات)
- **المقارنة التاريخية** = أداة مقارنة تفاعلية (اختيار 2-4 سنوات)
- **التقرير السنوي** = CRUD + نشر (وظيفة مختلفة)

لكن نزيل **تبويب "مقارنة سنوية"** من صفحة التقارير لأنه مكرر تماماً مع صفحة المقارنة التاريخية.

---

## إجمالي الملفات المطلوب تعديلها: 5

```text
1. AdminDashboard.tsx           — إصلاح فلترة (إشغال + إيرادات) + استخدام دوال مشتركة
2. PropertiesPage.tsx           — إصلاح فلترة (بطاقات + دخل)
3. ReportsPage.tsx              — إزالة تبويب "مقارنة سنوية" المكرر (7→6 تبويبات)
4. src/utils/dashboardComputations.ts — إنشاء (3 دوال مشتركة)
5. WaqifDashboard.tsx           — استخدام الدوال المشتركة (تطبيق على لوحة الواقف)
```

