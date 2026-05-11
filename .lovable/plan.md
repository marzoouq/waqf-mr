## نتائج التحقق المباشر من التقرير الخارجي

تم فحص كل بند من التقرير على الكود الفعلي. النتائج بالتفصيل:

### ✅ بنود صحيحة (يجب التصرف)

| البند | الدليل المباشر |
|---|---|
| `process-email-queue` لديه `verify_jwt = true` بينما الباقي `false` | `supabase/config.toml` سطر 16 |
| `supabase/functions/README.md` سطر 5 يقول "All Edge Functions … verify_jwt = false" | drift فعلي مع config.toml |
| `docs/api/edge-functions.md` سطر 119 ما زال يصف `generate-invoice-pdf` بـ `{ pdf_base64, file_name }` | بينما سطر 193 يحوي ملاحظة تصحيح — تناقض داخلي |
| `docs/API.md` قسم 6 يصف نفس الـ shape القديم | drift |
| `errorReporter.ts` يستخدم `supabase.rpc` مباشرة | استثناء مقصود (fallback) لكن غير موثّق صراحة |
| `notificationService.ts` يستخدم `.from().insert` مباشر fire-and-forget | استثناء غير موثّق |
| `diagnosticsService.ts` يستخدم `.from()` مباشر | استثناء غير موثّق (health check) |
| لا توجد retry/rate-limit policy موثّقة كحوكمة موحدة | مؤكد |
| Runtime validation محصور في endpoint واحد + RPC واحد | `useDashboardSummary` + `useSupportAnalytics` فقط |

### ❌ بنود غير دقيقة في التقرير

| ادعاء التقرير | الواقع |
|---|---|
| `nationalIdLogin.ts` ما زال يستخدم `supabase.functions.invoke` مباشرة | **خاطئ** — مُرحَّل في الجولة C، الاستدعاء الوحيد المتبقي هو `supabase.auth.setSession` (مسار auth وليس invoke) |
| "كل استدعاءات `supabase.functions.invoke` المباشرة" تحتاج ترحيل | الاستدعاءات المتبقية كلها استثناءات مبررة (`AuthContext.guard-signup` ممنوع التعديل بالقاعدة، tests، الغلاف نفسه) |

### 🟡 لا داعي للترحيل

- `AuthContext.tsx` — قاعدة المشروع تمنع تعديل ملفات المصادقة
- `errorReporter.ts` — fallback مقصود (لو فشل الغلاف، لا يجب أن يفشل تسجيل الخطأ)
- `notificationService` / `diagnosticsService` — `.from()` مباشر للجداول، ليس Edge Function/RPC

---

## خطة Version E — توثيق وحوكمة فقط (بدون ترحيل إضافي)

نطاق محدود: لا تعديل لمنطق التشغيل. فقط معالجة الـ drift والفجوات التوثيقية الحقيقية المكتشفة.

### المرحلة 1 — إصلاح الـ Docs Drift المؤكد

1. **`supabase/functions/README.md`**: تعديل العبارة العامة لتذكر استثناء `process-email-queue` (`verify_jwt = true` لأن استدعاءه عبر pg_cron داخلي).
2. **`docs/api/edge-functions.md`** سطر 119: استبدال `Response: { pdf_base64, file_name }` بالشكل الفعلي `{ results: Array<{id, invoice_number, success, error?}> }`.
3. **`docs/API.md`** قسم 6: نفس التصحيح + تحديث المثال البرمجي.

### المرحلة 2 — إنشاء Network Inventory موثّق

ملف جديد: `docs/api/network-inventory.md` يحوي جدولاً واحداً شاملاً:

```text
| Endpoint | النوع | المصادقة | الغلاف | Retry | Rate-limit | Cache | Validation |
```

يغطي: 17 Edge Function + 8 RPCs الرئيسية + استثناءات `.from()` المباشرة الموثقة.

### المرحلة 3 — توثيق Retry/Rate-limit Policy

إضافة قسم في `docs/api/README.md`:

- **auth-sensitive flows** (`nationalIdLogin`, `guard-signup`): `maxAttempts: 1`
- **429 responses**: لا retry + إظهار `retry_after`
- **validation errors**: لا retry
- **transient transport errors**: retry × 3 + backoff 250/500/1000
- **fire-and-forget (notifications)**: لا retry

### المرحلة 4 — توثيق Justified Exceptions Register

قسم في `docs/api/network-inventory.md` يبرر كل استثناء:

- `AuthContext.tsx` → سياسة المشروع تمنع التعديل
- `errorReporter.ts` → fallback مقصود
- `notificationService.ts` → fire-and-forget على جدول مباشر
- `diagnosticsService.ts` → فحوصات صحة على جداول مباشرة

### المرحلة 5 — توثيق CORS Verification Matrix

نقل نتائج CORS curl من جولة C إلى ملف ثابت `docs/api/cors-verification.md`:
4 origins (prod / www / preview / malicious) × 3 functions = نتائج موثّقة.

### المرحلة 6 — تحديث `.lovable/plan.md`

إضافة سجل Version E مع:
- ما تحقق من ادعاءات التقرير الخارجي وما رُفض منها
- البنود المنفذة
- البنود المؤجلة بوعي (Zod toolkit شامل، client throttling عام، test matrix كامل) — مع مبرر لكل واحد

### خارج النطاق (مرفوض بوعي)

- ❌ ترحيل `AuthContext.tsx` (قاعدة مشروع)
- ❌ ترحيل `errorReporter.ts` (fallback مقصود)
- ❌ توسيع Zod ليشمل كل endpoint — تكلفة عالية بلا قيمة فورية على endpoints مستقرة
- ❌ client-side throttling عام — السيرفر يفرضه عبر `check_rate_limit`
- ❌ تعديل ملفات runtime (لا حاجة بناءً على الفحص)

---

## الملفات المتأثرة

**تعديل:** `supabase/functions/README.md`, `docs/api/edge-functions.md`, `docs/API.md`, `docs/api/README.md`, `.lovable/plan.md`
**إنشاء:** `docs/api/network-inventory.md`, `docs/api/cors-verification.md`

**صفر تعديلات على كود التشغيل.** الجولة E توثيقية بالكامل.
