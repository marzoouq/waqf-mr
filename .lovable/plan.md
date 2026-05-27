# خطة التنفيذ النهائية — بعد التحقق المباشر من الكود وقاعدة البيانات

## أ. جدول التحقق الميداني (ما تم قياسه فعلًا في هذه الجلسة)

| الادّعاء السابق | فحص مباشر | النتيجة |
|---|---|---|
| A1-A7: 7 hooks بـ queryKey كـ string | `rg "queryKey:" hooks/data/**` على 5 ملفات + useIncome/useInvoices في السياق | ✅ **مؤكَّد** — 7 ملفات تستخدم `queryKey: 'xxx'` (string) في `createCrudFactory` |
| B1: ~30 سياسة RLS تستخدم `jwt_role()` | `SELECT … FROM pg_policies WHERE qual LIKE '%jwt_role%'` | ❌ **خاطئ** — صفر سياسات. جميع السياسات تستخدم `has_role(auth.uid(),...)` |
| C1: `advance_requests.fiscal_year_id` nullable + drift | `information_schema` + `COUNT(*) WHERE IS NULL` | ✅ nullable، **0 NULL** → الترحيل آمن |
| C2: `contracts.fiscal_year_id` nullable | نفس الفحص | ✅ nullable، **0 NULL** → الترحيل آمن |
| متوسط: `invoices/payment_invoices.fiscal_year_id` nullable | نفس الفحص | ✅ nullable، **0 NULL** في الاثنين → الترحيل آمن |
| B2: `disbursement_vouchers_public` بدون حراسة دور | `pg_get_viewdef` | ✅ **مؤكَّد** — الفلتر فقط `status='approved' AND is_fiscal_year_accessible(...)`، 12 عمودًا مكشوفًا بدون قيد دور |
| E1: `user_roles(user_id)` بدون فهرس | `pg_indexes` | ❌ **خاطئ** — يوجد UNIQUE `(user_id, role)` يعمل كفهرس B-tree لاستعلامات `user_id` (leading column) |
| متوسط: `disbursement_vouchers(expense_id)` بدون فهرس | `pg_indexes` | ❌ **خاطئ** — يوجد UNIQUE جزئي على `expense_id WHERE status <> 'void'` |
| متوسط: `rate_limits(key)` بدون فهرس | `pg_indexes` | ✅ **مؤكَّد** — فقط `pkey`، لا فهرس على `key` |
| D1: `useEmailMonitorPage` يستورد supabase | `code--view` (موجود سابقًا) | ✅ مؤكَّد |
| D2: `usePropertiesForm` يستورد supabase.rpc | `code--view` (موجود سابقًا) | ✅ مؤكَّد |
| D3: `VoucherList` hybrid (5 hooks + 3 mutations) | `code--view` (موجود سابقًا) | ✅ مؤكَّد |

**خلاصة الفحص:** 7/10 من الادّعاءات الحرجة صحيحة، 3/10 خاطئة وتُسقَط نهائيًا من الخطة.

---

## ب. الموجات المعتمدة فقط (مبنية على ادّعاءات مؤكَّدة)

### Wave 1 — استقرار React Query 🔴 (الأعلى أثرًا)

**المشكلة:** 7 hooks تمرّر `queryKey` كـ string لـ `createCrudFactory`، بينما المستهلكون يستدعون `invalidateQueries({ queryKey: ['xxx'] })` بـ array → عدم تطابق → invalidation صامت لا يحدث → UI يعرض بيانات قديمة بعد كل mutation. ولكن: يجب أولًا التحقق من سلوك المصنع داخل `crud/useListQuery.ts` و `crud/useCrudMutations.ts` — قد يلفّ string→array داخليًا. **الخطوة الأولى في الموجة: قراءة هذين الملفين والتأكد.**

**الحل (إن ثبت العدم اللفّ):**
- `useIncome.ts:21` → `queryKey: ['income']`
- `useExpenses.ts:21` → `queryKey: ['expenses']`
- `useAccounts.ts:15` → `queryKey: ['accounts']`
- `useContracts.ts:19` → `queryKey: ['contracts']`
- `useBeneficiaries.ts:24` → `queryKey: ['beneficiaries']`
- `useInvoices.ts:21` (factory call) → `queryKey: ['invoices']`
- `useUnits.ts:26` → `queryKey: ['all-units']`
- تحديث `CrudFactoryConfig.queryKey` ليكون `readonly unknown[]` بدل `string`.
- اختبار قبول: محاكاة create + التحقق من `getQueriesData(['income'])` يعود محدّثًا.

**إن ثبت أن المصنع يلفّ string→array داخليًا:** يصبح البند تنظيفًا تجميليًا فقط (تطابق نمط) لا إصلاحًا أمنيًا.

### Wave 2 — Contract & Financial Data Integrity 🔴

**SQL migration واحدة (0 NULL في الكل، آمنة):**
```sql
ALTER TABLE public.contracts            ALTER COLUMN fiscal_year_id SET NOT NULL;
ALTER TABLE public.advance_requests     ALTER COLUMN fiscal_year_id SET NOT NULL;
ALTER TABLE public.invoices             ALTER COLUMN fiscal_year_id SET NOT NULL;
ALTER TABLE public.payment_invoices     ALTER COLUMN fiscal_year_id SET NOT NULL;
```
- لا تغيير في `types.ts` يدويًا (يتجدد تلقائيًا).
- تحديث `mem://business-logic/finance/...` بأن `fiscal_year_id` أصبح إجباريًا في 4 جداول.

### Wave 3 — تأمين `disbursement_vouchers_public` 🔴

**المشكلة المؤكَّدة:** العرض يكشف 12 عمودًا (بما فيها `recipient_name`, `amount`, `work_description`) دون قيد دور. يكفي أن يحصل أي role مستقبلًا على `SELECT` على العرض ليرى سندات الصرف.

**الحل:**
```sql
DROP VIEW IF EXISTS public.disbursement_vouchers_public;
CREATE VIEW public.disbursement_vouchers_public
WITH (security_invoker = true) AS
SELECT id, voucher_number, expense_id, fiscal_year_id, recipient_name,
       amount, payment_method, work_description, status,
       approved_at, created_at, pdf_path
FROM public.disbursement_vouchers
WHERE status = 'approved'::voucher_status
  AND public.is_fiscal_year_accessible(fiscal_year_id)
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
  );

REVOKE ALL ON public.disbursement_vouchers_public FROM PUBLIC, anon;
GRANT SELECT ON public.disbursement_vouchers_public TO authenticated;
```
- اختبار قبول: استعلام بوصفه `beneficiary` يعود فارغًا؛ بوصفه `admin` يعود بصفوف.

### Wave 4 — معماري حرج 🟠

- **D1:** نقل استعلام `supabase` من `useEmailMonitorPage.ts` إلى `hooks/data/admin/useEmailMonitor.ts` جديد، ثم تنظيف الـ page hook ليُركّب فقط.
- **D2:** نقل `supabase.rpc` من `usePropertiesForm.ts` إلى `hooks/data/properties/usePropertyFormActions.ts`.
- **D3:** استخراج `useVoucherList.ts` يجمع 5 الـ hooks + 3 mutations، وتحويل `VoucherList.tsx` إلى presentational.
- اختبار: `pageHookBindingContract.test.ts` الموجود يلتقط أي تسريب جديد لـ supabase في طبقة page.

### Wave 5 — فهرس `rate_limits` 🟠

```sql
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_window 
  ON public.rate_limits (key, window_start DESC);
```
- يحسّن `lookup-national-id` وأي rate-limit مستقبلي.

### Wave 6 — تنظيف معماري متوسط 🟠

- نقل 5 ملفات بأسماء `Utils/Filter/Types` خارج `hooks/`:
  - `hooks/data/settings/appSettingsUtils.ts` → `utils/settings/`
  - `hooks/page/admin/activeContractsFilter.ts` → `utils/contracts/`
  - `hooks/data/core/inferMutationArg.ts` + `crudFactory.types.ts` → `types/data/`
- تقسيم 2 god-hooks:
  - `useZatcaSettings.ts` (198س) → `useZatcaSettingsState` + `useZatcaSettingsActions`
  - `useEmailMonitorPage.ts` بعد Wave 4 سيقلّ تلقائيًا
- 6 `useEffect(setState)` form-sync → إما `useReducer` مع `dispatch({type:'hydrate'})` أو controlled props من الأب.

### Wave 7 — UI Tokens & SEO/a11y 🟡

- استبدال 7 ألوان hardcoded في components بـ `hsl(var(--token))`.
- إزالة OG/Twitter المكرر في `index.html:81-84`.
- تحديث `sitemap.xml`: تصحيح `lastmod` لتاريخ حقيقي، إضافة `/install` و `/auth`.
- تحديث `splash` alt في `index.html:95` إلى `"شعار وقف مرزوق بن علي الثبيتي"`.
- إضافة `type="button"` لـ 3 أزرار في `BylawsViewPage`, `BylawsPage`, `WaqfInfoBar`.

### Wave 8 — Tests & CI 🟡

- إصلاح اختبار `useContracts.test.ts:46` الوهمي → اختبار فعلي لسلوك hook عبر `renderHook` + mocked client.
- إضافة `src/test/contractsSafeViewRls.test.ts`: 3 محاور (admin يرى، beneficiary لا يرى PII، waqif لا يرى).
- إضافة `CloseYearDialog` test لحالة `hasAccount=false`.
- في `ci.yml`: إضافة `bunx vitest run --coverage` مع threshold 60% (نفس المستخدم محليًا).
- توحيد منطق `npm audit` في `test.yml` (إزالة `|| true` المضلّل).

### Wave 9 — i18n + dependencies 🟡

- نقل النصوص العربية من `useZatcaOnboardingReadiness/useWaqifDashboardPage/useGreeting/useWholePropertyRental` إلى `src/constants/copy/*` (بعد مراجعة كل سطر للتأكد أنه نص مستخدم وليس enum/key).
- إزالة `ws` و `lodash` من `dependencies` في `package.json` (نقلهما إلى `overrides` فقط إن لزم).
- إزالة ازدواجية `packageManager: npm@11.6.2` (المشروع يستخدم bun).

### Wave 10 — توصيات اختيارية 🔵

- ESLint: إضافة `@typescript-eslint/no-floating-promises`, `import/no-cycle`, `consistent-type-imports`.
- توحيد `staleTime/gcTime` كثوابت في `lib/queryStaleTime.ts`.
- توثيق `DeferredRender`/`lazyWithRetry` في `ARCHITECTURE.md`.
- cache لـ `node_modules` في `ci.yml`.

---

## ج. بنود مُسقَطة نهائيًا (ثبت بطلانها بالفحص المباشر)

| البند | سبب الإسقاط |
|---|---|
| B1: 30 سياسة `jwt_role` | استعلام `pg_policies` أعاد 0 صفوف |
| E1: فهرس `user_roles(user_id)` | UNIQUE composite `(user_id, role)` يخدم استعلامات `user_id` |
| فهرس `disbursement_vouchers(expense_id)` | UNIQUE جزئي موجود |

---

## د. ترتيب التنفيذ ومعايير القبول لكل موجة

```text
Wave 1 (Code)  → Wave 2 (Migration) → Wave 3 (Migration) → Wave 4 (Code)
   → Wave 5 (Migration) → Wave 6 (Code) → Wave 7 (UI) → Wave 8 (Tests)
   → Wave 9 (i18n) → Wave 10 (Optional)
```

بعد كل موجة:
1. `bunx vitest run`
2. `supabase--linter` (للموجات SQL: 2, 3, 5)
3. `security--run_security_scan` (للموجة 3)
4. مراجعة `mem://index.md` وتحديث القواعد المتأثرة

**نطاق محظور (لا تغيير):**
- `supabase/config.toml`, `client.ts`, `types.ts`, `.env`
- منطق `verify_jwt=false` (مقصود)
- ملفات auth الحساسة (`AuthContext`, `ProtectedRoute`, `SecurityGuard`) إلا بطلب صريح
- Page Hook Pattern وحدود lib/utils (سليمة)

عند الموافقة على هذه الخطة، أبدأ بـ Wave 1 — قراءة `crud/useListQuery.ts` و `crud/useCrudMutations.ts` أولًا لتحديد إن كان إصلاح queryKey مطلوبًا فعليًا أو تجميليًا فقط.
