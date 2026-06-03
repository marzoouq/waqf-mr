# تقرير التدقيق الشامل — 2026-06-03

تدقيق شامل لاتساق البطاقات والوظائف عبر لوحات الناظر/المستفيد/المحاسب وتوحيد المنطق المالي.

## ملخص تنفيذي

| المرحلة | الحالة | المخرج |
|---------|---------|---------|
| 1. توحيد المنطق المالي (Stage 3 المؤجلة) | ✅ مُنجز | Migration + تحديث Frontend |
| 2. أداة تشخيص اتساق البطاقات | ✅ مُنجز | 6 فحوصات جديدة في بطاقة #9 |
| 3. تدقيق وظيفي شامل (3 لوحات) | ✅ مُنجز | 21 ملاحظة (3 Critical/High، 9 Medium، 9 Low) |
| 4. التحقق النهائي والتوثيق | ✅ مُنجز | 317 اختباراً مالياً ناجح + هذا التقرير |

---

## المرحلة 1 — توحيد المنطق المالي

### تغييرات قاعدة البيانات

**Migration:** `20260603055652_03bc17ed-b627-4620-a161-e66e061004a8.sql`

- `get_dashboard_full_summary` RPC أُعيد بناؤها:
  - `available_amount` و`remaining_balance` تُغلَّف بـ `GREATEST(0, ...)` لمنع القيم السالبة
  - أُضيفت حقول `_raw` للشفافية الإدارية
  - YoY تُرجع الآن `prev_corpus_previous`, `prev_vat`, `prev_zakat`, `prev_net_after_zakat` من snapshot السنة السابقة
- **حماية السنوات المقفلة:** لا تغييرات على جدول `accounts` أو snapshots. تم التحقق على السنة المقفلة `2024-2025`:
  ```
  available_raw = available_clamped = 995,000.78 ✓
  net_after_zakat_derived = 1,272,228.14 ✓
  ```

### تغييرات Frontend

- `useDashboardSummary.ts` — يُفضّل `prev_net_after_zakat` من الـ snapshot على الحساب المحلي
- `AggregatedYoY` type + `dashboardSummarySchema` (Zod) — أُضيفت الحقول الجديدة

---

## المرحلة 2 — أداة التشخيص (بطاقة #9)

أُضيفت 6 فحوصات جديدة لاتساق البطاقات في `src/lib/diagnostics/checks/cardConsistency.ts`،
تظهر تلقائياً في صفحة `/dashboard/diagnostics` للأدمن:

| الفحص | الغرض |
|--------|---------|
| `checkAvailableAmountNonNegative` | لا حساب فيه `waqf_corpus_manual > waqf_revenue` |
| `checkDistributionsWithinAvailable` | مجموع توزيعات السنوات المقفلة ≤ المتاح |
| `checkBeneficiaryShareFormula` | تطابق حصة كل مستفيد مع `share × available` |
| `checkAdvancesWithinShare` | السلف المعتمدة ≤ الحصة المتوقعة |
| `checkOverduePendingNoOverlap` | لا تداخل بين متأخر/معلّق (فلاتر المحاسب) |
| `checkCarryforwardIntegrity` | لا قيم سالبة ولا مراجع ذاتية في المرحّل |

---

## المرحلة 3 — التدقيق الوظيفي

### 🔴 لوحة المستفيد — Critical/High

| # | الموقع | المشكلة | الإصلاح |
|---|--------|---------|----------|
| C-01 | `useMySharePage.ts:64` | `advance_settings` يفترض `enabled: true` كافتراضي خطر (يُظهر زر السلفة قبل تحميل الإعدادات) | استخدم `enabled: false` كما في `useBeneficiaryDashboardPage.ts:33` |
| H-01 | `useMyShare.ts:51,57` | لا `Math.max(0, ...)` على `serverMyShare` والـ fallback المحلي — قد تظهر حصة سالبة | لفّ القيمتين بـ `Math.max(0, …)` |
| H-02 | `FiscalYearContext.tsx` | لا يقرأ من `sessionStorage` (انتهاك core rule) | اقرأ/اكتب `fiscal_year_id` في sessionStorage |

### 🔴 لوحة المحاسب — High

| # | الموقع | المشكلة | الإصلاح |
|---|--------|---------|----------|
| H-01 | `OverdueInvoicesCard.tsx:65` | الزر يوجّه إلى `/dashboard/contracts` بدلاً من `/dashboard/invoices?status=overdue` | تصحيح المسار |
| H-02 | `useAdminDashboardStats.ts:105-107` | بطاقات Income/Expenses/NetAfterExpenses تظهر للمحاسب بلا `visibility:'admin-only'` | حدّد سياسة الإفصاح مع مالك المنتج |
| H-03 | `FiscalYearWidget.tsx` (مُستخدم في `AdminDashboard.tsx:67`) | يكشف `totalIncome` + `contractualRevenue` للمحاسب | لفّ بـ `role === 'admin'` |

### 🟠 لوحة الناظر — High

| # | الموقع | المشكلة | الإصلاح |
|---|--------|---------|----------|
| H-1 | `PagePerformanceCard.tsx:4,28-35` | انتهاك Page Hook Pattern — `useState` + `useSyncExternalStore` + `useMemo` داخل UI | استخراج إلى `usePagePerformanceCard.ts` |

### 🟡 ملاحظات Medium (9)

- **AiAssistant.tsx:86-97** — `Tabs/TabsList/TabsTrigger` بدون `TabsContent` — كسر إمكانية الوصول
- **AccountantDashboardView.tsx:50-55** — بطاقة ZATCA ميتة بلا `link` (نفس الملاحظة من تدقيقَين)
- **AccountantDashboardView.tsx:57** — عنوان "عقود بدون سنة" خاطئ (الصحيح: "عقود بدون فواتير")
- **AccountantDashboardView.tsx:21** — `return null` أثناء التحميل بدل Skeleton — قفزة تخطيط
- **MonthlyCollectionCard.tsx:31** — `return null` صامت عند عدم وجود بيانات
- **FiscalYearWidget.tsx:63-77** — منطق حسابي داخل UI (انتهاك Page Hook Pattern)
- **useDisclosurePage.ts:62-69** — `distLoading` مفقود من حساب `isLoading` → Flickering
- **useMyShare.ts** — `useTotalBeneficiaryPercentage` يُستدعى حتى عند توفر `serverMyShare`
- **BeneficiaryAdvanceCard.tsx:34-39** — الزر يُنقل بدلاً من فتح dialog — توقع مرتبك

### 🔵 ملاحظات Low (9)

تفاصيل في تقارير الـ sub-agents (محفوظة في chat history). تشمل: IIFE بدل `useMemo` في `useAdminDashboardPage.ts:92`، حقول `@deprecated` غير مُنظّفة في `useAdminDashboardStats.ts`، casts بدون Zod في hooks المستفيد، إلخ.

---

## المرحلة 4 — التحقق النهائي

- **اختبارات:** `bunx vitest run src/hooks/domain/financial src/utils/financial` → **317/317 pass** ✅
- **اختبارات التشخيص:** `bunx vitest run src/lib/diagnostics` → **46/46 pass** ✅
- **DB sanity:** السنة المقفلة `2024-2025` — قيم raw/clamped/net_after_zakat متطابقة، لا انحراف
- **ملفات محمية:** لم تُمسّ `auth/`, `client.ts`, `types.ts`, `config.toml`, `.env`

---

## التوصيات اللاحقة (مرتبة حسب الأولوية)

1. **(Critical)** إصلاح `useMySharePage.ts:64` و`useMyShare.ts` — Math.max(0) + safe default
2. **(High)** إصلاح رابط `OverdueInvoicesCard` المكسور
3. **(High)** قرار منتج: ما البطاقات المالية المسموح بها للمحاسب؟ ثم تطبيق visibility flags
4. **(High)** نقل `FiscalYearContext` إلى sessionStorage
5. **(Medium)** استخراج المنطق من `PagePerformanceCard` و`FiscalYearWidget`
6. **(Medium)** إصلاح بنية `AiAssistant` Tabs أو استبدالها بـ SegmentedControl
7. **(Medium)** ربط بطاقة ZATCA + تصحيح العنوان "عقود بدون فواتير"
8. **(Low)** تنظيف الحقول `@deprecated` وإضافة Zod schemas للـ RPC casts

> **ملاحظة:** هذه التوصيات قراءة فقط — لم تُطبَّق في هذا التدقيق وفقاً للخطة المعتمدة.
