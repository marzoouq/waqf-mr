## نتائج التحقق الجنائي المباشر للتقرير

تم فحص كل ادعاء فني بحثاً عن دليل ملموس في الكود. النتائج:

### ✅ ادعاءات صحيحة جديدة (لم تُعالَج في Version E)

| الادعاء | الدليل المباشر |
|---|---|
| `_shared/auth.ts` موجود ومُستعمل في 4 functions فقط (`admin-manage-users`, `generate-invoice-pdf`, `process-email-queue`, `check-contract-expiry`) | `rg -l "_shared/auth"` |
| `email-admin` لا يستخدم abstraction المشترك — auth/role check يدوي | تأكيد بصري + غياب من قائمة `_shared/auth` consumers |
| `beneficiary-summary` لا يستخدم abstraction المشترك — `getUser`/`check_rate_limit` يدوي | الأسطر 38, 51 |
| `webauthn` dispatcher رفيع + handlers متفرقة | `ls supabase/functions/webauthn/handlers/` |
| **`guard-signup` body فعلي = `{ email, password }`** بينما docs تقول `{ email, national_id?, phone? }` | الأسطر 51, 95-96 من `guard-signup/index.ts` |
| **`lookup-national-id` response = `{ found, masked_email, remaining, auth_error?, session? }`** بينما docs تقول `{ email?, error?, retry_after? }` | الأسطر 136-198 من `lookup-national-id/index.ts` |
| **`email-admin` actions = `get_stats \| retry_dlq`** بينما docs تقول `list \| retry \| cancel` | السطر 10: `ALLOWED_ACTIONS = ["get_stats", "retry_dlq"]` |

### ❌ ادعاءات خاطئة في التقرير

| الادعاء | الواقع |
|---|---|
| `generate-invoice-pdf` body/response في docs خاطئة | **مُصحَّح فعلاً في Version E** — التقرير يستخدم لقطة قديمة |
| المشروع يحتاج "policy override matrix" للـ retry/429 | **موجود فعلياً** في `docs/api/README.md` قسم "Retry & Rate-limit Policy" المُضاف في Version E |

### 🟡 ملاحظات معمارية صحيحة لكن خارج النطاق التنفيذي

- **عدم اتساق auth orchestration بين Edge Functions:** ادعاء صحيح هندسياً، لكن إعادة كتابة auth في functions حسّاسة (`webauthn`, `lookup-national-id`, `guard-signup`) **محظورة بقاعدة المشروع** ("لا تعدّل ملفات المصادقة دون طلب صريح"). الإجراء المقبول: **توثيق المصفوفة وتبرير الاستثناءات**، ليس refactoring.
- **runtime validation محدود:** صحيح — مغطى عمداً في Version E (`dashboardSummary` + `supportAnalytics` فقط) كقرار نضج.
- **client throttling عام:** مرفوض بقاعدة "Do Not Implement Backend Rate Limiting" في تعليمات المنصة.

---

## خطة Version F — معالجة Drift الجديد المؤكد (توثيقياً فقط)

نطاق محدود: 3 إصلاحات docs + مصفوفة auth abstraction adoption. صفر تعديلات على Edge Functions.

### المرحلة 1 — إصلاح Drift توثيقي مؤكد بالدليل المباشر

**`docs/api/edge-functions.md`:**
1. `guard-signup` (سطر ~123): تغيير Body من `{ email, national_id?, phone? }` إلى `{ email: string, password: string }` + Response من `{ allowed, reason? }` إلى `{ success: true, message: string } | { error: string }`.
2. `lookup-national-id` (سطر ~135): تغيير Response إلى الشكل الفعلي `{ found: boolean, masked_email: string, remaining: number, auth_error?: string, session?: { access_token, refresh_token }, retry_after?: number }` + إضافة ملاحظة "لا يُعاد البريد الكامل أبداً — `masked_email` فقط لمنع enumeration".
3. `email-admin` (سطر ~113): تغيير Body من `{ action: 'list'|'retry'|'cancel', id? }` إلى `{ action: 'get_stats' | 'retry_dlq', queueName?: 'auth_emails'|'transactional_emails' }`.

**`docs/API.md`:** نفس التصحيحات الثلاثة في الأقسام المقابلة (إن وُجدت).

### المرحلة 2 — مصفوفة Auth Abstraction Adoption

إضافة قسم جديد في `docs/api/network-inventory.md`:

| Function | يستخدم `_shared/auth.ts`؟ | السبب عند عدم الاستخدام |
|---|:-:|---|
| `admin-manage-users` | ✅ | — |
| `generate-invoice-pdf` | ✅ | — |
| `process-email-queue` | ✅ | — |
| `check-contract-expiry` | ✅ | — |
| `dashboard-summary` | ❌ | (يحتاج فحص — قد يكون مرشّحاً للترحيل لاحقاً) |
| `beneficiary-summary` | ❌ | role-scoped مع rate-limit مخصصة بمفتاح خاص |
| `email-admin` | ❌ | dispatcher صغير مع منطق DLQ متخصص |
| `webauthn` | ❌ | dispatcher مع handlers متعددة بسياسات auth مختلفة (anon/JWT لكل عملية) |
| `lookup-national-id` | ❌ | **anon flow** — لا يوجد JWT للتحقق منه |
| `guard-signup` | ❌ | **anon flow** — قبل التسجيل أصلاً |
| `auth-email-hook` | ❌ | webhook بـ HMAC، ليس JWT |
| `health-check` | ❌ | عام بلا auth |
| `ai-assistant` | (للفحص) | — |
| `zatca-*` (5) | (للفحص) | — |

ملاحظة عند نهاية المصفوفة: **التوحيد الكامل غير ممكن** — هناك 3 فئات auth جوهرياً (JWT user / webhook signature / anon) وفي كل فئة استثناءات مبررة.

### المرحلة 3 — تحديث `.lovable/plan.md`

تسجيل Version F: ما تحقق، ما رُفض، الفرق بين drift توثيقي (تم) و refactoring معماري (مرفوض بقاعدة).

---

## خارج النطاق (مرفوض بدليل صريح)

- ❌ Refactoring auth في `webauthn`/`guard-signup`/`lookup-national-id` → قاعدة "لا تعدّل ملفات المصادقة"
- ❌ ترحيل `email-admin`/`beneficiary-summary` إلى `_shared/auth.ts` → كل واحدة لديها rate-limit key مخصص + سياسة role مختلفة؛ الترحيل يخلق regression حقيقي
- ❌ بناء "contract tests" على Edge Functions → خارج نطاق طلب التوثيق؛ مرشّح لجولة منفصلة
- ❌ runtime validation شامل → قرار نضج موثّق في Version E
- ❌ client-side throttling → ممنوع بتعليمات المنصة
- ❌ تعديل أي كود تشغيلي

## الملفات المتأثرة

**تعديل (3):** `docs/api/edge-functions.md`, `docs/API.md`, `docs/api/network-inventory.md`, `.lovable/plan.md`
**إنشاء:** لا شيء

**صفر تعديلات على Edge Functions أو كود تشغيلي. الجولة F توثيقية بالكامل، تستجيب فقط للـ drift المؤكد بدليل مباشر من كود الـ functions نفسها.**
