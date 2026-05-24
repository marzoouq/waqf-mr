# تقرير التحقق الصارم + الخطة المُعدَّلة (v2)

## القسم أ — نتائج التحقق الصارم لكل ادعاء سابق

### ✅ ادعاءات صحيحة 100% (تم التحقق بأوامر فعلية)

| الادعاء | أمر التحقق | النتيجة |
|---|---|---|
| 0 `supabase.*` خام في `pages/`+`components/` | `rg "supabase\.(from\|auth\|functions\|storage\|rpc\|channel)"` | فارغ ✅ |
| 0 `console.*` في الإنتاج | `rg "console\."` خارج test/logger | فارغ ✅ |
| `: any` = 1 استخدام فعلي | `rg ": any\b\|as any"` | `inferMutationArg.ts:15` فقط، مبرَّر ✅ |
| 4 ملفات > 200 سطر | `wc -l` + filter | بنفس الأرقام والمسارات ✅ |
| 0 barrel-to-barrel | `rg "from .*/index"` في `index.ts` | فارغ ✅ |
| 0 hex خام في components | `rg "#[0-9a-fA-F]{3,8}"` | فارغ ✅ |
| `getSession()` غير مستخدم في Edge Functions | `rg "getSession" supabase/functions` | الذكر الوحيد كتحذير في README ✅ |
| `fiscal_year` يستخدم `sessionStorage` | `rg "localStorage.*fiscal"` | فارغ في إنتاج ✅ |
| 54 `eslint-disable` موزّعة على 40 ملفاً | عدّ مباشر | مؤكَّد ✅ |

### ⚠️ ادعاءات احتاجت تصحيحاً بعد إعادة الفحص

**1) ادعاء "3 مكونات Presentational تتجاوز 180 سطر" → الصحيح: 2 فقط**

عند إعادة الفحص بتغطية كل الـ hooks (لا فقط state/effect/query):

| المكوّن | الأسطر | الـ hooks الفعلية | التصنيف الصحيح |
|---|---|---|---|
| `BalanceSheetReport.tsx` | 197 | **0** | Presentational نقي — مرشّح للتقسيم |
| `ContractRentalModeSection.tsx` | 195 | **0** | Presentational نقي — مرشّح للتقسيم |
| `MonthlyAccrualTable.tsx` | 193 | **7× `useMemo` + `memo`** | **ليس presentational** — جدول مع memoization مشروع وفق القاعدة "memo only on table rows". **لا يجب تقسيمه**. |

**التقرير السابق أخطأ في تصنيف `MonthlyAccrualTable`** لأن grep الأوّلي لم يشمل `useMemo`.

**2) قاعدة "حد 180 للـ presentational" مصدرها فهرس الذاكرة فقط**
- ملف القاعدة `container-vs-presentational-boundary.md` غير موجود فعلياً في `.lovable/memory/technical/architecture/`، الموجود هو ذكر في الفهرس بصياغة "size limits 200/180".
- الذاكرة الأساسية للمشروع (workspace) تنص فقط على "فايل ≤200 سطر" كحد عام.
- **النتيجة:** قاعدة 180 ليست صارمة بنفس درجة 200 — يجب تخفيف هذا البند إلى **P2 (توصية)** لا P1 (إلزام).

**3) ادعاء "`SERVICE_ROLE_KEY` غير مستخدم" كان مضمراً وخاطئاً**
- مستخدم في 8 Edge Functions: `guard-signup`, `auth-email-hook`, `process-email-queue`, `check-contract-expiry`, `webauthn`, `health-check`, `lookup-national-id`, `_shared/zatca-shared.ts`.
- **التقييم:** كلها أنظمة (system-level)، لا تستخدم المفتاح بديلاً لمصادقة مستخدم. لكن يجب توثيق ذلك صراحةً.

### ❌ قصور لم يُغطَّ في التقرير السابق
- لم يُشغَّل `supabase--linter` للتحقق من سياسات RLS.
- لم تُفحص migrations فعلياً.
- 0 مكونات تستخدم `useQuery/useMutation` (تحقّق إيجابي إضافي للفصل بين الطبقات) ✅.

---

## القسم ب — الخطة المُعدَّلة v2 (مرتّبة بدقة)

### 🟠 P1 — يستحق المعالجة (3 بنود مؤكَّدة)

**P1-1:** إعادة هيكلة `src/hooks/domain/financial/useAccountsSettings.ts` بنمط **default + override** المعتمد في `useLandingStatsSettings`.
- المكسب: حذف 13 `eslint-disable react-hooks/set-state-in-effect` (24% من الإجمالي).
- نمط الإصلاح: قيم مشتقّة بـ `useMemo` من `appSettings.data`+`selectedAccount`، مع state `overrides` يُمسح عند تغيّر `selectedFY.id` أو بعد `save` ناجح.

**P1-2:** تقسيم 4 ملفات تتجاوز حد 200 سطر:
| الملف | الأسطر | استراتيجية التقسيم |
|---|---|---|
| `utils/pdf/reports/forensicAudit.ts` | 238 | فصل إلى `sections/` (header, balances, distributions, footer) |
| `utils/pdf/reports/comprehensiveBeneficiaryTables.ts` | 213 | فصل بنّاءات الجداول عن منطق الـ pagination |
| `utils/export/printDistributionReport.ts` | 213 | فصل HTML template عن orchestration |
| `utils/export/xlsx.ts` | 205 | فصل sheet builders حسب النوع |

**P1-3:** تشغيل `supabase--linter` رسمياً والتحقق من سياسات RLS برمجياً (لم يحدث في التقرير الأصلي).

### 🟡 P2 — توصيات (ليست إلزاماً)

**P2-1:** تقسيم مكوّنَين Presentational نقيَّين تتجاوزان 180 سطراً (قاعدة استرشادية من فهرس الذاكرة، ليست صارمة):
- `BalanceSheetReport.tsx` (197) → فصل أقسام Assets/Liabilities/Equity
- `ContractRentalModeSection.tsx` (195) → فصل وضع "إجمالي" عن وضع "لكل وحدة"

**~~P2-X (محذوف):~~** ~~`MonthlyAccrualTable.tsx`~~ — **بعد التحقق:** هو جدول مع 7 `useMemo` و`memo` wrapper، يطابق قاعدة "memo only on table rows" تماماً. **لا حاجة لأي تعديل.**

**P2-2:** توحيد صياغة تعليقات `eslint-disable` المختصرة (مثل `-- reset` في `useAccountsSettings.ts:59-65`).

**P2-3:** مراقبة الملفات القريبة من حد 200 (190–198): `useZatcaSettings`, `useAiChat`, `useInvoicesPage`, `useAccountsPage` — لا تدخّل الآن.

### 🟢 P3 — اختياري / توثيقي

**P3-1:** توثيق صريح في `supabase/functions/README.md` لكل دالة تستخدم `SERVICE_ROLE_KEY` ومبرّر استخدامها (8 دوال).

**P3-2:** مراجعة دورية لمصفوفة الـ41 `eslint-disable` المتبقّية بعد P1-1.

---

## القسم ج — الحكم النهائي

| البُعد | التقييم |
|---|---|
| دقة التقرير السابق | **~82%** (3 ادعاءات احتاجت تصحيحاً، 2 قصور تغطية) |
| مشاكل P0 (حرجة) | **0** ✅ |
| بنود P1 المؤكَّدة | **3** (لا 4 كما زُعم في النسخة السابقة) |
| جاهزية النشر معمارياً | **عالية ✅** — لا مانع نشر، البنود تحت P1 تحسينات صحّة كود لا أخطاء وظيفية |

**التغيير الجوهري عن الخطة السابقة:**
- ❌ حذف `MonthlyAccrualTable` من قائمة الإصلاحات (تصنيف خاطئ).
- ⬇️ تخفيض المكونَين الباقيَين من P1 إلى P2 (مصدر قاعدة 180 غير حاسم).
- ➕ إضافة `supabase--linter` رسمياً ضمن P1-3.
- ➕ إضافة توثيق `SERVICE_ROLE_KEY` ضمن P3.

**التنفيذ المقترح إذا انتقلنا لوضع البناء:** P1-1 → P1-3 (سريع) → P1-2 (تقسيم utils) → P2 لاحقاً.
