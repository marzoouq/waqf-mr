# فحص جنائي للتقرير — نتائج موثّقة بالأرقام

قرأت كل الملفات التي طلب التقرير فحصها سطراً بسطر، ثم قِست الادعاءات بالكود الفعلي. هذه هي النتائج.

---

## القياسات الحقيقية (وليست الانطباعات)

```
طبقة                                              | العدد
-------------------------------------------------|------
hooks/data يستورد @/lib/services                  | 19
hooks/data يستدعي supabase مباشرة                 | 46
نسبة تبنّي service layer في hooks/data           | ~29%

hooks/page + application يستورد services         | 8
hooks/page + application يستدعي supabase مباشرة  | 1

components/ يستدعي supabase مباشرة               | 0  ✅
pages/      يستدعي supabase مباشرة               | 0  ✅

uses of invoke() wrapper                          | 14
uses of rpc() wrapper                             | 23
bypasses invoke() (production code)               | 1  (AuthContext → guard-signup)
bypasses rpc()    (production code)               | 1  (errorReporter — مقصود)
```

---

## ادعاءات التقرير — مُتحقَّق منها

| # | الادعاء | الحكم | الدليل |
|---|---------|------|--------|
| 1 | `lib/services` نموذجية ومتقدمة | ✅ **مؤكّد** | supportService/appSettingsService/securityService: CRUD نظيف بمسؤولية واحدة. notificationService يفصل dual-API (async vs fire-and-forget) بشكل صريح ومسمى جيداً. |
| 2 | يجب أن تصبح القاعدة لا الاستثناء | ✅ **مؤكّد رقمياً** | 29% تبنّي فقط في `hooks/data`. 46 ملف ما زال يضرب supabase مباشرة. |
| 3 | `searchService` نموذج جيد للفصل | ✅ مؤكّد | data-access شفاف؛ `globalSearchFn` يبقى composer. |
| 4 | تعليق "نقي" مضلّل في `searchService` | ✅ مؤكّد | السطر 4 يقول "نقية" لكنه stateful I/O. |
| 5 | `nationalIdLogin` orchestrator ثقيل | ✅ **مؤكّد** | 147 سطر، 4 مسؤوليات: validation + invoke + session + access-log. |
| 6 | `notificationService` ينهي rename plan | ✅ مؤكّد | الأسماء الجديدة (`enqueue/broadcast/silent`) دلاليّة وواضحة. |
| 7 | `lib/api/invoke.ts` و `rpc.ts` ناضجان | ✅ **أعلى مما وصفه التقرير** | retry + backoff + classification + `onAuthError` + payload monitoring + DEV instrumentation. هذه طبقة بنية تحتية ممتازة. |
| 8 | layer الـ realtime "محورية" | ❌ **مبالغ** | الواقع: 3 ملفات صغيرة (factory + bfcache-safe). README سطرين. لا يستحق التوصيف "محوري". |
| 9 | `RootLayout` global sink | ⚠️ غير محقَّق هذه الجولة | يحتاج فحص مستقل. |

---

## نتائج التقرير لم يلتقطها — اكتُشفت في الفحص

### 1) **خرق حدود فعلي** في `components/` (التقرير لم يره)
README الـ services يقول صراحةً: "لا تُستدعى مباشرة من `pages/` أو `components/`". لكن:
- `src/components/auth/ProtectedRoute.tsx` يستورد من `@/lib/services`
- `src/components/layout/IdleTimeoutManager.tsx` يستورد من `@/lib/services`

هذه **خروقات معمارية حقيقية** غير ملتقطة بالحارس الحالي.

### 2) **AuthContext يتجاوز `invoke()` wrapper**
`src/contexts/AuthContext.tsx:38` يستدعي `supabase.functions.invoke('guard-signup')` مباشرة. يفقد retry وclassification وperf monitoring. هذا أهم bypass في الكود.

### 3) **`errorReporter` يتجاوز `rpc()` wrapper**
مقصود (تجنّب recursion) لكنه غير موثّق في الملف.

### 4) **الحارس لا يفرض القواعد الجديدة**
`scripts/check-conventions.mjs` لا يحتوي قاعدة:
- "ممنوع `@/lib/services` من `components/` أو `pages/` (عدا tests)"
- "ممنوع `supabase.functions.invoke` خارج `lib/api/invoke.ts`"
- "ممنوع `supabase.rpc(` خارج `lib/api/rpc.ts` و `lib/errorReporter.ts`"

بدون هذه القواعد، التبنّي سيبقى 29% للأبد.

### 5) **عدم تماثل service vs hook**
`appSettingsService` موجود وبالكامل (CRUD على `app_settings`)، لكن `hooks/data` فيه ملفات أخرى تستعلم نفس الجداول مباشرة دون المرور عبره. هذه **migration debt** حقيقية.

---

## التقييم النهائي الصارم

| البُعد | الحكم بعد التحقق |
|--------|-------------------|
| backend (migrations, RLS, RPC, email infra) | **8.5/10** — أنضج طبقة |
| `lib/api/*` و `lib/services/*` (التصميم) | **8.5/10** — تصميم ممتاز |
| `lib/services/*` (التبنّي عبر المشروع) | **5.5/10** — 29% فقط |
| boundaries المفروضة بالحارس | **6/10** — يفرض الـ الأساسي لا التفاصيل |
| `hooks/page` و `hooks/application` (semantics) | **6.5/10** — تحسّن بعد إعادة التسمية |
| `hooks/data` (consistency) | **5/10** — أنماط مختلطة بوضوح |

**الحكم**: التقرير الخارجي **دقيق في ~85%** من ادعاءاته، لكنه فاتته 3 خروقات معمارية حقيقية موجودة في الكود (ProtectedRoute, IdleTimeoutManager, AuthContext bypass).

---

## الخطة المقترحة (مرتبة بالأثر/المخاطرة)

### P0 — إصلاحات فورية ومحدودة (جلسة واحدة قصيرة)
1. **AuthContext → invoke()**: استبدال `supabase.functions.invoke('guard-signup')` بـ `invoke<...>('guard-signup', ...)`. مكسب فوري: retry + classification + perf.
2. **توثيق bypass في errorReporter**: تعليق سطرين يشرحان لماذا لا يستخدم `rpc()` (تجنّب recursion).
3. **تصحيح تعليق "نقية" في searchService**: تغيير إلى "طبقة وصول بيانات".

### P1 — تقوية الحارس (جلسة واحدة)
4. إضافة قواعد للـ `scripts/check-conventions.mjs`:
   - منع `@/lib/services` من `components/` و `pages/` (مع white-list صريح لـ ProtectedRoute و IdleTimeoutManager إن قُرّر إبقاؤها استثناءً موثّقاً).
   - منع `supabase.functions.invoke(` خارج `src/lib/api/invoke.ts`.
   - منع `supabase.rpc(` خارج `src/lib/api/rpc.ts` و `src/lib/errorReporter.ts`.
5. إصلاح الخروقين في ProtectedRoute و IdleTimeoutManager: نقل الاستدعاء إلى hook (`hooks/data/` أو `hooks/auth/`) ثم استهلاكه من المكوّن.

### P2 — رفع تبنّي service layer (جلسات متعدّدة، اختياري)
6. مشروع تدريجي: لكل خدمة موجودة، مراجعة `hooks/data/` التي تستعلم نفس الجدول وتحويلها لاستخدام الخدمة. الأولوية للخدمات الأكثر إعادة استخدام (`appSettingsService`, `notificationService`, `fiscalYearService`).
7. **لا يلزم 100%**: هدف عملي = 60–70% تبنّي. الحالات البسيطة (select واحد لجدول واحد) يجوز إبقاؤها مباشرة.

### P3 — تأجيل صريح
- تفكيك `nationalIdLogin` إلى 4 sub-functions: **مؤجَّل**. الملف يعمل، اختباره ممكن عبر AppNotify injection. تقسيمه الآن = شكلي.
- فحص `RootLayout` global sink: جلسة مستقلة.
- مراجعة `get_beneficiary_dashboard` RPC: ليست مشكلة معمارية، هي **قرار صحيح** (single trip للوحة). توثيق blast radius فقط في تعليق README كافٍ.

---

## ما الذي سأنفّذه إن اعتمدت الخطة
- **P0 فقط** افتراضياً (3 تعديلات صغيرة، مخاطرة دنيا، أثر مباشر).
- إن أردت `P1`، أضيف القواعد للحارس + أصلح الخرقين (يتطلب فحص ProtectedRoute و IdleTimeoutManager لتحديد البديل المناسب).
- `P2` يحتاج موافقة منفصلة لكل خدمة لأن codemod واسع.
