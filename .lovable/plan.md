

# الخطة النهائية بعد الفحص الجنائي العميق

## النتائج المحسومة بأدلة الكود

| الادعاء | الحكم | الدليل |
|---|---|---|
| #1 `.env` على GitHub | ✅ صحيح | ملف موجود محلياً، لكن ANON publishable |
| #2 تكرار `(error as { status?: number })` | ✅ صحيح | `queryClient.ts` السطور 7, 16, 38 |
| #3 `void _logAccessEvent` | ❌ خاطئ | `grep` أرجع صفر — تم تنظيفه فعلاً |
| #4 `useDashboardPrefetch` في Context | ✅ صحيح | السطر 83 |
| #9 `allContracts` و`contracts` مكررة | ✅ صحيح | `useAccountsData.ts` السطر 68 |
| #10–#14 utilities/types في hooks/ | ✅ صحيح | 3 ملفات pure + 2 functions داخل hook |
| #15 `UUID_RE` inline | ✅ صحيح | `FiscalYearContext.tsx` السطر 25 |
| #26 ألوان hex | ❌ خاطئ | `hsl(var(--primary))` متغيرات CSS |
| #30 hardcoded waqf name | ✅ أسوأ | **6 مواضع** (وليس 4): InvoicesPage, PrintFooter, usePaymentInvoicesTab, useInvoicePreviewBuilder, PrivacyPolicy, TermsOfUse |
| #56–#60 hooks في wrong folder | ❌ خاطئ | لا queries supabase، types فقط |
| #95 `60 * 1000` literal | ✅ صحيح | `STALE_FINANCIAL = 60_000` متاح وغير مستخدم |
| #96 `sessionStorage` مباشر | ✅ صحيح | `safeSessionGet/Set/Remove` متاحة في `lib/storage.ts` لكن غير مستخدمة في 4 مواضع |

## نطاق التنفيذ المقترح: **B = P0 (موثَّق فقط) + P1 + P2**

### 🔴 P0 — أمان (توثيق فقط، لا git history rewrite)
1. **توثيق في README الجذر**: ملاحظة أن `.env` يحوي ANON_KEY فقط (publishable عمداً) — لا أسرار. **لا أقترح `git filter-repo`** لأن المخاطر (كسر شراكات/PRs/forks) أكبر من الفائدة لمفتاح publishable.

### 🟠 P1 — تنظيف فوري (5 إصلاحات)
2. إنشاء `src/utils/error/getErrorStatus.ts`:
   ```ts
   export const getErrorStatus = (error: unknown): number | undefined =>
     (error as { status?: number })?.status;
   ```
3. استبدال 3 مواضع في `queryClient.ts` (السطور 7, 16, 38) باستخدام `getErrorStatus`.
4. استيراد `STALE_FINANCIAL` في `queryClient.ts` واستبدال `60 * 1000` (السطر 33) به.
5. حذف `allContracts: mergedContracts` المكرر من return في `useAccountsData.ts` السطر 68 — والإبقاء على `contracts` فقط. **تحقق أولاً من المستهلكين**: البحث في `src/` عن استخدام `.allContracts` لاستبدالها بـ`.contracts`.

### 🟡 P2 — توحيد الحدود (4 نقلات)
6. **نقل pure functions** من `useAccountsCalculations.ts` (السطور 11–28: `getPaymentCountFromMonths`, `statusLabel`) إلى `src/utils/financial/contractHelpers.ts` (الملف موجود). تحديث الاستيراد.
7. **نقل ملفات helpers** من `src/hooks/data/financial/` إلى `src/utils/financial/`:
   - `multiYearHelpers.ts` + `multiYearHelpers.test.ts`
   - `yearComparisonHelpers.ts` + `yearComparisonHelpers.test.ts`
   - تحديث جميع الـ imports.
8. **نقل types**: `useDashboardSummary.types.ts` → `src/types/financial/dashboard.ts` (إنشاء المجلد). تحديث استيراد `useDashboardSummary.ts`.
9. **توحيد sessionStorage** في `FiscalYearContext.tsx`:
   - السطر 32: استبدال `sessionStorage.getItem` بـ `safeSessionGet`.
   - السطور 50, 55, 91: استبدال `sessionStorage.removeItem` بـ `safeSessionRemove`.
   - السطر 89: استبدال `sessionStorage.setItem` بـ `safeSessionSet`.
   - حذف `try/catch` المكرر — `lib/storage.ts` يتولى ذلك.
10. **نقل `UUID_RE`** من `FiscalYearContext.tsx` السطر 25 إلى `src/utils/validation/regexPatterns.ts` كـ `export const UUID_REGEX`.

## ما يُرفض صراحةً

- **#3** `_logAccessEvent` — غير موجود في الكود.
- **#7, #18** README موجود فعلاً.
- **#21** `lucide-react` بدون `^` — قرار صحيح.
- **#26** ألوان CSS variables — مطابقة للذاكرة.
- **#56–#60** hooks في "المجلد الخاطئ" — types فقط، الفصل سليم.
- **#90** FiscalYear "مكرر" — re-export فقط.
- **#92–#93** `engines`/`sideEffects` — غير ملائمة لـ Lovable.
- **P3 (نقل منطق InvoicesPage إلى hook)** — يُؤجَّل: تغيير ضخم (8 دوال + إعادة هيكلة hook بـ400+ سطر) يستحق موجة منفصلة بعد اعتماد P1+P2.
- **P0 git filter-repo** — يُرفض: مخاطره > فوائده لمفتاح publishable.

## ملفات ستُعدَّل (10 ملفات + 2 ملف جديد)

**جديدة:**
- `src/utils/error/getErrorStatus.ts`
- `src/types/financial/dashboard.ts`

**ستُنقل:**
- `src/hooks/data/financial/multiYearHelpers.{ts,test.ts}` → `src/utils/financial/`
- `src/hooks/data/financial/yearComparisonHelpers.{ts,test.ts}` → `src/utils/financial/`
- `src/hooks/data/financial/useDashboardSummary.types.ts` → `src/types/financial/dashboard.ts`

**ستُعدَّل:**
- `src/lib/queryClient.ts` (3 casts + staleTime)
- `src/hooks/financial/useAccountsData.ts` (حذف allContracts المكرر)
- `src/hooks/financial/useAccountsCalculations.ts` (حذف pure functions + استيراد)
- `src/utils/financial/contractHelpers.ts` (إضافة الدوال المنقولة)
- `src/contexts/FiscalYearContext.tsx` (sessionStorage + UUID_RE)
- `src/utils/validation/regexPatterns.ts` (إضافة UUID_REGEX)
- `src/hooks/data/financial/useDashboardSummary.ts` (تحديث استيراد types)
- مستهلكو `multiYearHelpers`/`yearComparisonHelpers` (تحديث imports)

## التحقق بعد التنفيذ

- `grep -rn "(error as { status" src/` → يجب أن يظهر فقط في `getErrorStatus.ts`
- `grep -rn "60 \* 1000" src/lib/queryClient.ts` → صفر نتائج
- `grep -rn "\.allContracts" src/` → صفر نتائج
- `grep -rn "sessionStorage\." src/contexts/FiscalYearContext.tsx` → صفر نتائج
- `grep -rn "from '@/hooks/data/financial/multiYearHelpers'" src/` → صفر نتائج (مُنقَل)
- `npx tsc --noEmit` → صفر أخطاء

## الزمن المتوقع

- P0 توثيق: 2 دقيقة
- P1 (3 إصلاحات): 8 دقائق
- P2 (4 نقلات): 20 دقيقة
- **المجموع: ~30 دقيقة**

## المخاطر

| العملية | المخاطر | التخفيف |
|---|---|---|
| حذف `allContracts` | مستهلكون قد يكسرون | grep قبل الحذف + استبدال |
| نقل helpers | imports كثيرة | استبدال شامل + tsc check |
| sessionStorage abstraction | تغيير semantic للمفاتيح | safeSessionGet يحاكي السلوك بدقة |
| نقل types | tsc errors محتملة | tsc بعد كل نقلة |

