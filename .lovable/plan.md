# خطة Stage 5 — النسخة النهائية v2

**بعد التحقق من الكود الفعلي** — تم تصحيح 6 انحرافات من v1، وتقليص الملفات من 11 إلى 9 جديدة + 4 معدَّلة.

تنفيذ البندين المعتمدين:
- 🔴 E2E للناظر + المستفيد (عالي)
- 🟡 Numerical Audit DB↔RPC↔UI (متوسط)
- ⚪ AST UI Integrity — **مُستبعد بقرار**

---

## 🔍 ما اكتُشف من فحص الكود الفعلي

| اكتشاف | الأثر على الخطة |
|---|---|
| لا يوجد `src/pages/admin/` — كل الصفحات تحت `src/pages/dashboard/` | حذف `NumericalAuditPage.tsx` المقترح |
| `/dashboard/diagnostics` مسجَّل مسبقاً بـ `ADMIN_ONLY` ويستخدم `SystemDiagnosticsPage` (135 سطر، 9 بطاقات) | حذف تعديلات `router/sidebar` كاملاً |
| `src/lib/diagnostics/varianceReport.ts` (Stage 4) + 9 ملفات في `checks/` (218 سطر في `cardConsistency.ts` وحده) | حذف `numericalAudit.ts` المنفصل — نضيف داخل `checks/` |
| `useSystemDiagnostics.ts` (99 سطر) هو المنسّق الموحَّد بالفعل | حذف `useNumericalAuditPage.ts` المنفصل |
| `cardConsistency.ts` يستعلم DB raw لكن **لا يقارن مع RPC** — فجوة حقيقية | الفحوصات الجديدة غير مكررة ✅ |
| التنقل عبر `src/constants/navigation.ts` (سطر 58) + `SidebarNavList.tsx` | صفر تعديل تنقّل |
| `utils/pdf/index.ts` 6 أسطر نظيفة | حذف بند "تنظيف dead code" |

---

## القسم A — E2E للناظر والمستفيد 🔴

### A1. بنية المجلد
```text
src/test/e2e/
├── _helpers/
│   ├── renderDashboard.tsx        ← QueryClient + MemoryRouter + AuthContext mock
│   ├── mockSupabase.ts            ← Mock factory لـ @/integrations/supabase/client
│   ├── mockFiscalYear.ts          ← sessionStorage + useFiscalYearContext mocks
│   └── fixtures/
│       ├── adminDashboard.ts      ← RPC fixtures (سنة نشطة + مقفلة)
│       └── beneficiaryData.ts     ← Disclosure + Accounts + Distributions
├── adminDashboardFlow.test.tsx       ← جديد
├── beneficiaryDashboardFlow.test.tsx ← جديد
└── accountantDashboardFlow.test.tsx  ← موجود — يُعاد توجيهه نحو _helpers
```

### A2. سيناريوهات لوحة الناظر (5)
1. **التحميل الأولي**: عرض كل البطاقات الرئيسية (Revenue, Expenses, VAT, Zakat, Admin Share, Waqif Share, Waqf Revenue, Available)
2. **تبديل السنة المالية**: مقفلة → تحديث `sessionStorage` + استدعاء RPC جديد + قيم snapshot
3. **التبويبات**: Overview / Financial / Distributions / Reports — كل tab يعرض محتواه
4. **زر التقرير السنوي PDF**: `aggregatedAnnualReport()` mock — تمرير fyId صحيح
5. **حارس السنة المقفلة**: admin يمر / accountant يُمنع

### A3. سيناريوهات لوحة المستفيد (5)
1. **عرض حصتي**: `my_share, paid_advances, carryforward, rawNet (Math.max(0))`
2. **تبديل السنة → إصلاح H-02**: تغيير `fiscal_year_id` → `useDisclosurePage` + `useAccountsViewPage` يعيدان الجلب (التحقق عبر `queryKey` يحوي fyId)
3. **صفحة الإفصاح**: عرض البنود + زر PDF
4. **صفحة الحسابات**: السلف + الفائض المرحّل + التوزيعات
5. **حظر التعديل**: لا أزرار CRUD

### A4. قواعد الـMocks
- `vi.mock('@/integrations/supabase/client')` على مستوى الملف
- `QueryClient` بـ `retry=false, gcTime=0`
- `userEvent` بدل `fireEvent`
- استيراد `pr` من `@/routes/ProtectedRouteHelper` لاختبار الحراس
- المسارات الحقيقية: `/dashboard`, `/beneficiary`

### A5. معايير القبول
- 3 ملفات × ≥5 سيناريو = **≥15 test** ينجح
- زمن < 8s لكل ملف
- لا flakiness على 3 تشغيلات متتالية

---

## القسم B — Numerical Audit DB↔RPC↔UI 🟡

### B1. الملف الجوهري: `src/lib/diagnostics/checks/numericalAudit.ts`

يُصدِّر 4 فحوصات بصيغة `CheckResult` (متوافق مع نظام التشخيص الحالي):

```ts
// نمط مماثل لـ checks/cardConsistency.ts الموجود
export async function checkDbVsRpcTotalIncome(): Promise<CheckResult>
// يقارن SUM(invoice_items.amount) مع get_dashboard_full_summary().total_income

export async function checkDbVsRpcExpenses(): Promise<CheckResult>
// يقارن SUM(expenses.amount) مع get_dashboard_full_summary().expenses_total

export async function checkRpcVsUiAvailableAmount(): Promise<CheckResult>
// يقارن get_dashboard_full_summary().available_amount مع حساب client-side من نفس المدخلات

export async function checkSnapshotIntegrityClosedYear(): Promise<CheckResult>
// warn فقط — يقارن snapshot لسنة مقفلة مع إعادة حساب نظري (لا fail)
```

**threshold:** 0.01 SAR (موحَّد مع `varianceReport.ts` و `cardConsistency.ts`)

### B2. عدم التكرار مع `cardConsistency.ts`
- `checkAvailableAmountNonNegative` (موجود) → يفحص علامة فقط
- `checkDistributionsWithinAvailable` (موجود) → يفحص حد أعلى للتوزيعات
- **الجديد** → يقارن طبقتين (DB↔RPC, RPC↔UI) — لا تكرار

### B3. التكامل
- `src/lib/diagnostics/checks.ts`: إضافة export + سطر بطاقة #10 "تدقيق رقمي DB↔RPC↔UI"
- `src/hooks/page/admin/management/useSystemDiagnostics.ts`: إضافة الفحوصات الأربعة للقائمة المنسَّقة
- لا تعديل على `SystemDiagnosticsPage.tsx` (تعرض البطاقات ديناميكياً)
- لا تعديل على `varianceReport.ts` (يبقى لمقارنة الصفوف فقط)

### B4. الاختبارات: `numericalAudit.test.ts`
- حالة matched → status='pass'
- حالة drift مصطنع → status='fail' + `root_cause_hint`
- حالة snapshot قديم → status='warn' (لا fail)

### B5. صلاحيات DB
لا migration. الاستعلامات الخام تستخدم `supabase.from(...)` المحمي بـRLS الـadmin (نفس النمط الحالي في `cardConsistency.ts`).

---

## القسم C — تنظيف الكود المرافق 🧹

### C1. ملفات ملموسة فقط (لا scan شامل)
- التحقق من التزام **قواعد الذاكرة** على الملفات الـ9+4 المعدَّلة:
  - لا `console.*` → `logger`
  - لا ألوان hex خارج SVG/Canvas
  - لا توست في `hooks/data/`
  - `utils/` نقي

### C2. ESLint + TS strict
- lint على المسارات المعدَّلة
- لا `any`، لا `@ts-ignore`

### C3. حدود الحجم
- كل ملف ≤200 سطر (Container vs Presentational)
- `numericalAudit.ts` متوقع ~150 سطر — يبقى تحت الحد

---

## القسم D — التحقق النهائي

مصفوفة التحقق الخماسية (`mem://conventions/testing-and-quality`):
1. ✅ `bunx vitest run` — كل الاختبارات خضراء (موجودة + ≥15 جديد)
2. ✅ TypeScript build بدون أخطاء
3. ✅ ESLint بدون تحذيرات جديدة
4. ✅ فحص يدوي لـ `/dashboard/diagnostics` — البطاقة الجديدة تظهر وتعمل
5. ✅ فحص يدوي للوحة الناظر — تبديل سنة + فتح تقرير PDF

---

## ملفات الإضافة والتعديل

### جديدة (9)
```text
src/test/e2e/_helpers/renderDashboard.tsx
src/test/e2e/_helpers/mockSupabase.ts
src/test/e2e/_helpers/mockFiscalYear.ts
src/test/e2e/_helpers/fixtures/adminDashboard.ts
src/test/e2e/_helpers/fixtures/beneficiaryData.ts
src/test/e2e/adminDashboardFlow.test.tsx
src/test/e2e/beneficiaryDashboardFlow.test.tsx
src/lib/diagnostics/checks/numericalAudit.ts
src/lib/diagnostics/checks/numericalAudit.test.ts
```

### معدَّلة (4)
```text
src/test/e2e/accountantDashboardFlow.test.tsx              ← refactor للـ _helpers
src/lib/diagnostics/checks.ts                              ← export البطاقة #10
src/hooks/page/admin/management/useSystemDiagnostics.ts    ← إضافة الفحوصات
.lovable/plan.md                                           ← Stage 5 closed
```

### ملفات محمية — **لن تُلمس**
`supabase/config.toml`, `src/integrations/supabase/client.ts`, `types.ts`, `.env`, `AuthContext.tsx`, `ProtectedRoute.tsx`, `SecurityGuard.tsx`

### ملفات كان مخططاً لمسها وحُذفت من v2
- ❌ `src/App.tsx` — لا تعديل
- ❌ `AdminSidebar.tsx` — غير موجود أصلاً
- ❌ `src/pages/admin/diagnostics/NumericalAuditPage.tsx` — مكرر مع SystemDiagnosticsPage
- ❌ `src/hooks/page/admin/diagnostics/useNumericalAuditPage.ts` — مكرر مع useSystemDiagnostics
- ❌ `src/lib/diagnostics/numericalAudit.ts` — مكرر مع varianceReport.ts

---

## التقدير الزمني والمخاطر

| المرحلة | تقدير |
|---|---|
| A — E2E (helpers + 2 ملفات + refactor) | ~40 دقيقة |
| B — Numerical Audit (4 فحوصات + اختبار + integration) | ~25 دقيقة |
| C — تنظيف ملموس | ~5 دقائق |
| D — تحقق خماسي | ~10 دقائق |

**المخاطر والتخفيف:**
- **Mocks معقدة لـ `useAdminDashboardPage`** (15+ hook فرعي) → mock على مستوى `@/integrations/supabase/client` فقط
- **بطء استعلامات الفحص على 5+ سنوات** → الفحص يدوي بزر "تشغيل" (`useSystemDiagnostics` يدعمها أصلاً)
- **تداخل خفي مع `cardConsistency`** → قراءة كامل الـ218 سطر قبل الإضافة لتأكيد عدم التكرار

---

## الفوائد بعد التنفيذ

1. **صفر تكرار** — توسعة منظومة قائمة بدل بناء مواز
2. **اتساق UX** — كل التشخيصات في `/dashboard/diagnostics`
3. **توفير 70% ملفات** (9 + 4 بدل 16 + 5 في v1)
4. **استفادة مجانية** من CSV/JSON export ولوحة عرض البطاقات الموجودة في `SystemDiagnosticsPage`
5. **التزام كامل بـ Core Modularization v7** — لا hook page منفصل لأن المنسّق موجود
6. **اكتشاف drifts الجذرية** بين 3 طبقات (DB raw / RPC / UI) — يكشف أخطاء RPC نفسها لا الواجهة فقط
7. **E2E يضمن استقرار الناظر والمستفيد** بعد تغييرات Stage 3 الجوهرية

---

## ما **لن** تفعله هذه الخطة (صراحةً)
- ❌ AST UI Integrity (مؤجل بقرار صريح)
- ❌ أي تعديل RLS / migrations / DB schema
- ❌ أي تعديل على ملفات المصادقة المحمية
- ❌ أي تعديل لمنطق RPC المالية (فحص فقط)
- ❌ تعديل بطاقات H-02/H-03 (مقفلة في Stage 4)
- ❌ صفحة جديدة أو route جديد أو عنصر sidebar جديد
