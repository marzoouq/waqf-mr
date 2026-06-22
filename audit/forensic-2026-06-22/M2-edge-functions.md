# M2 — Forensic Audit: Edge Functions
**تاريخ الفحص:** 2026-06-22  
**النطاق:** 21 Edge Function في `supabase/functions/` (باستثناء `_shared/` و `deno.json`)  
**المفتش:** وكيل Explore الجنائي  
**الإصدار:** 1.0.0

---

## ملخص تنفيذي

من أصل 21 دالة Edge Function تم فحصها جنائياً عبر 6 محاور أمنية:

| المحور | الحالة |
|--------|--------|
| استخدام `getUser()` بدلاً من `getSession()` | ✅ ممتاز — لا يوجد أي استخدام لـ `getSession()` |
| Zod validation على body | ⚠️ معظمها آمن — 3 حالات قصور |
| CORS headers صحيحة في كل الردود | ✅ ممتاز — محكوم عبر `getCorsHeaders()` مشترك |
| عدم استخدام SERVICE_ROLE_KEY كبديل للمصادقة | ✅ ممتاز — `_shared/auth.ts` يفصل بين العميلين |
| عدم تسريب أسرار في console.log | ⚠️ بعض الحالات الطرفية |
| تحقق الدور للعمليات الحساسة | ✅ ممتاز — `allowedRoles` مطبّق في كل دالة حساسة |

**إجمالي الإشكاليات:** 0 حرجة · 2 متوسطة · 5 منخفضة · 4 معلوماتية

---

## جدول الفحص الجنائي التفصيلي

| # | Function | Issue | Severity | File:Line | Evidence | Recommendation |
|---|----------|-------|----------|-----------|----------|----------------|
| 1 | `admin-manage-users` | ✅ لا مشكلات | — | `index.ts:50` | `authenticate(req, corsHeaders, { allowedRoles: ["admin"] })` + `AdminBodySchema.safeParse(body)` | — |
| 2 | `ai-assistant` | تسجيل رسالة خطأ خام قد تحتوي على تفاصيل داخلية | LOW | `index.ts:176` | `console.error("ai-assistant error:", e instanceof Error ? e.message : "Unknown error")` — الرسالة آمنة نسبياً لكن `e.message` قد يكشف مسارات داخلية عند فشل `fetchWaqfData` | استبدل بـ `console.error("ai-assistant error")` بدون الرسالة التفصيلية في الإنتاج |
| 3 | `ai-assistant` | ✅ `getUser()` مستخدم | — | `_shared/auth.ts:97` | `await userClient.auth.getUser()` | — |
| 4 | `ai-assistant` | ✅ Zod صحيح | — | `index.ts:20-27` | `RequestSchema` + `MessageSchema` مُطبَّقان | — |
| 5 | `auth-email-hook` | raw error يُسجَّل في catch خارجي | MEDIUM | `index.ts:317` | `console.error('Webhook handler error:', error)` — يسجّل كائن `error` كاملاً بدون تعقيم؛ قد يحتوي payload البريد (email, token, URL) | استبدل بـ `console.error('Webhook handler error:', error instanceof Error ? error.message : 'unknown')` |
| 6 | `auth-email-hook` | `/preview` يستخدم CORS مفتوح `*` | INFO | `index.ts:83-86` | `'Access-Control-Allow-Origin': '*'` — مقصود بتصميم (محمي بـ `LOVABLE_API_KEY`)؛ موثّق بتعليق | لا تغيير مطلوب؛ التوثيق كافٍ |
| 7 | `auth-email-hook` | `SUPABASE_SERVICE_ROLE_KEY` لأغراض Webhook | INFO | `index.ts:244-246` | `createClient(..., SUPABASE_SERVICE_ROLE_KEY)` — مقبول هنا لأن الـ webhook لا يمر بجلسة مستخدم؛ المصادقة تتم عبر توقيع Lovable | — |
| 8 | `beneficiary-summary` | حقل `bank_account` يُجلب لكن لا يُعاد | INFO | `index.ts:46` | `select("id, name, share_percentage, user_id, phone, email, bank_account")` ثم الاستجابة تُرجع فقط `id, name, share_percentage, user_id` (سطر 126) — الحماية موجودة لكن يُفضَّل حذف الحقل من الـ SELECT | احذف `bank_account, phone, email` من الـ `select()` لتقليل surface area |
| 9 | `check-contract-expiry` | لا Zod validation على body | LOW | `index.ts:5-59` | الدالة تقبل body لكن لا تُحلّله ولا تتحقق منه بـ Zod — مقبول لأن الدالة لا تستخدم body parameters، إلا أن الاتساق مع بقية الدوال مطلوب | أضف `const _body = RequestBodySchema.safeParse({})` أو وثّق صراحةً أن الدالة cron-only بلا body |
| 10 | `check-contract-expiry` | تدفق مصادقة ثنائي (service_role OR user) | INFO | `index.ts:19-58` | يقبل `isServiceRole(token)` (cron) أو user مصادق (admin) — المنطق سليم لكن يزيد التعقيد | — |
| 11 | `dashboard-summary` | ✅ كامل | — | `index.ts:29-34` | `authenticate` + `RequestSchema` (Zod) + CORS | — |
| 12 | `email-admin` | `lastError` يُعاد للعميل بدون تعقيم | MEDIUM | `index.ts:140,149` | `lastError = e instanceof Error ? e.message : String(e)` ثم `JSON.stringify({ ok: true, moved: movedCount, error: lastError })` — رسائل pgmq الداخلية (تفاصيل schema, constraints) قد تُعرض للـ admin | فلتر `lastError` أو استبدله برسالة عامة مثل `"فشل نقل بعض الرسائل"` |
| 13 | `generate-invoice-pdf` | ✅ كامل | — | `index.ts:36-43` | `authenticate(["admin","accountant"])` + `BodySchema` (Zod) + CORS | — |
| 14 | `generate-voucher-pdf` | `formatError()` تسجّل stack trace كامل | LOW | `index.ts:103,108-114` | `console.error("generate-voucher-pdf error:", formatError(err))` حيث `formatError` يُرجع `err.stack` — Stack traces قد تكشف مسارات نظام الملفات الداخلية | استبدل `formatError` بـ `err instanceof Error ? err.message : String(err)` |
| 15 | `guard-signup` | ✅ استخدام SERVICE_ROLE مبرر | INFO | `index.ts:35-38` | `createClient(..., SERVICE_ROLE_KEY)` لإنشاء المستخدم عبر Admin API — مبرر بتصميم (Signup function لا تملك JWT بعد) | — |
| 16 | `guard-signup` | HIBP error يُسجَّل بالتفاصيل | LOW | `index.ts:135` | `console.warn("HIBP check failed (fail-open):", hibpErr.message)` — قد يُسجّل تفاصيل شبكية حساسة (proxy errors, DNS) | اكتفِ بـ `console.warn("HIBP check failed (fail-open)")` |
| 17 | `health-check` | بلا مصادقة + SERVICE_ROLE للفحص | INFO | `index.ts:24-27` | `createClient(..., SERVICE_ROLE_KEY)` لاستعلام `fiscal_years` — لا حاجة لـ SERVICE_ROLE في health check | استخدم `SUPABASE_ANON_KEY` بدلاً من `SERVICE_ROLE_KEY` للفحص (القراءة فقط) |
| 18 | `lookup-national-id` | بلا مصادقة (Pre-auth by design) | INFO | `index.ts:1-14` | موثّق بتعليق مُفصَّل في رأس الملف؛ يستخدم `ANON_KEY` فقط؛ محمي بـ rate limit ثنائي + Luhn + SHA-256 hashing لمفتاح الـ rate limit | — |
| 19 | `multi-year-summary` | ✅ كامل | — | `index.ts:27-32` | `authenticate(["admin","accountant"])` + `RequestSchema` (Zod) + CORS | — |
| 20 | `process-email-queue` | بلا Zod على body (cron-only) | INFO | `index.ts:25-60` | لا يُحلّل body؛ مبرر لأنه cron worker يعتمد على `isServiceRole(token)` للمصادقة | — |
| 21 | `webauthn` (dispatcher) | ✅ Zod على كل branch | — | `index.ts:19-70` | `DispatchSchema` + `VerifyBodySchema` مُطبَّقان على كل action | — |
| 22 | `webauthn/register-options` | `getAuthUser()` يستخدم `getUser()` ✅ | — | `helpers.ts:61` | `supabase.auth.getUser()` | — |
| 23 | `webauthn/auth-options` | Rate limit بـ IP فقط (بدون user) | INFO | `handlers/auth-options.ts:12-23` | مقبول في مرحلة pre-auth؛ الـ challenge نفسه مُوقَّت ومرتبط بالـ credential لاحقاً | — |
| 24 | `webauthn/auth-verify` | ✅ مصادقة cryptographic كاملة | — | `handlers/auth-verify.ts:61-72` | `verifyAuthenticationResponse()` من `@simplewebauthn/server` | — |
| 25 | `year-comparison-summary` | ✅ كامل | — | `index.ts:28-33` | `authenticate(["admin","accountant"])` + `RequestSchema` (Zod) + CORS | — |
| 26 | `zatca-onboard` | `console.error("CSR generation error:", csrErr)` | LOW | `index.ts:126` | `csrErr` قد يحتوي على تفاصيل المفتاح الخاص الجزئي عند فشل `p256.sign()` | فلتر: `console.error("CSR generation error:", csrErr instanceof Error ? csrErr.message : "unknown")` |
| 27 | `zatca-onboard` | ✅ `authenticateAdmin()` + Zod | — | `index.ts:35-43` | `authenticateAdmin(req, corsHeaders, "zatca-onboard")` + `RequestSchema.safeParse(body)` | — |
| 28 | `zatca-renew` | لا Zod على body (لا body مطلوب) | INFO | `index.ts:24-47` | الدالة لا تستخدم body parameters؛ OTP يأتي من RPC `consume_zatca_otp`؛ المنطق سليم | — |
| 29 | `zatca-renew` | `console.error("Renew CSR generation error:", csrErr)` | LOW | `index.ts:88` | نفس مشكلة zatca-onboard:126 | فلتر الرسالة |
| 30 | `zatca-report` | ✅ كامل | — | `index.ts:33-41` | `authenticateAdmin()` + `RequestSchema` (Zod) + CORS | — |
| 31 | `zatca-signer` | `console.error("Signing failed:", signErr)` | LOW | `index.ts:249` | `signErr` من عملية `p256.sign()` — قد يكشف تفاصيل المفتاح الخاص عند فشل التوقيع | `console.error("Signing failed:", signErr instanceof Error ? signErr.message : "unknown")` |
| 32 | `zatca-xml-generator` | `errorMessage` كامل يُسجَّل | INFO | `index.ts:127` | `JSON.stringify({ error: errorMessage, timestamp })` — يسجّل رسالة الخطأ الخام للسيرفر فقط (لا يُعاد للعميل) — مقبول | — |

---

## نتائج محور بمحور

### 1. مصادقة عبر `getUser()` (لا `getSession()`)

**الحالة: ✅ ممتاز**

- جميع الدوال التي تحتاج مصادقة مستخدم تستخدم `_shared/auth.ts:authenticate()` الذي يستدعي `auth.getUser()` حصراً (`_shared/auth.ts:97`).
- `webauthn/helpers.ts:61` — `getAuthUser()` يستخدم `getUser()` مباشرةً.
- لا يوجد أي استخدام لـ `getSession()` في أي ملف.

### 2. Zod validation على body

**الحالة: ⚠️ جيد مع استثناءات مبررة**

- 17 دالة من أصل 21 لديها Zod schema صريح.
- `check-contract-expiry`, `process-email-queue`, `zatca-renew` لا تستخدم Zod لأنها لا تستقبل body parameters — مبرر بتصميم (cron workers).

### 3. CORS headers في كل الردود

**الحالة: ✅ ممتاز**

- `_shared/cors.ts` يُحدد قائمة بيضاء صارمة: 3 origins محددة + regex pattern للـ preview subdomains بـ project UUID محدد.
- جميع الدوال تستدعي `getCorsHeaders(req)` في البداية وتُمرر `corsHeaders` لكل `Response`.
- مسار `/preview` في `auth-email-hook` يستخدم `*` عن قصد (محمي بـ API key).

### 4. عدم استخدام SERVICE_ROLE_KEY كبديل للمصادقة

**الحالة: ✅ ممتاز**

- `_shared/auth.ts` يُفصل بوضوح بين:
  - `userClient` (ANON_KEY + Bearer token) لـ `getUser()`
  - `admin` (SERVICE_ROLE) لعمليات DB بعد التحقق من الهوية
- لا توجد دالة تستخدم SERVICE_ROLE_KEY كطريقة لتجاوز المصادقة.
- `guard-signup`, `health-check`, `auth-email-hook`, `process-email-queue`: استخدامات SERVICE_ROLE مبررة (إنشاء مستخدمين، فحص صحة، معالجة webhook، cron worker).

### 5. عدم تسريب أسرار في console.log

**الحالة: ⚠️ معظمها آمن مع حالات طرفية**

- المشكلات الفعلية: `auth-email-hook:317` (MEDIUM)، `email-admin:140,149` (MEDIUM).
- حالات LOW: `zatca-signer:249`, `zatca-onboard:126`, `zatca-renew:88` — قد تسرّب تفاصيل عمليات التشفير.
- كل الدوال تستخدم `maskEmail()` عند تسجيل عناوين البريد.

### 6. تحقق الدور للعمليات الحساسة

**الحالة: ✅ ممتاز**

| العملية | الدور المطلوب | الدالة |
|---------|--------------|--------|
| إدارة المستخدمين | `admin` فقط | `admin-manage-users` |
| تقارير الحسابات | `admin`, `accountant` | `dashboard-summary`, `multi-year-summary`, `year-comparison-summary` |
| ZATCA operations | `admin` فقط | `zatca-onboard`, `zatca-renew`, `zatca-report`, `zatca-signer` |
| توليد PDF | `admin`, `accountant` | `generate-invoice-pdf`, `generate-voucher-pdf` |
| بيانات المستفيد | `beneficiary`, `admin`, `accountant` | `beneficiary-summary` |
| المساعد الذكي | جميع الأدوار المعتمدة | `ai-assistant` |

---

## الإشكاليات المرتبة حسب الأولوية

### 🔴 حرجة — لا يوجد

### 🟠 متوسطة (2 إشكاليات)

| # | الدالة | الملف:السطر | الوصف |
|---|--------|------------|-------|
| M1 | `auth-email-hook` | `index.ts:317` | `console.error('Webhook handler error:', error)` يسجّل كائن Error خام قد يحتوي على email/token من payload الـ webhook |
| M2 | `email-admin` | `index.ts:140,149` | `lastError` (رسائل pgmq الداخلية) يُعاد للعميل مباشرةً في JSON response |

### 🟡 منخفضة (5 إشكاليات)

| # | الدالة | الملف:السطر | الوصف |
|---|--------|------------|-------|
| L1 | `zatca-signer` | `index.ts:249` | `console.error("Signing failed:", signErr)` — قد يسرّب تفاصيل p256 عند فشل التوقيع |
| L2 | `zatca-onboard` | `index.ts:126` | `console.error("CSR generation error:", csrErr)` — نفس المشكلة |
| L3 | `zatca-renew` | `index.ts:88` | `console.error("Renew CSR generation error:", csrErr)` — نفس المشكلة |
| L4 | `generate-voucher-pdf` | `index.ts:103` | `formatError(err)` يُرجع `err.stack` كاملاً في السجل |
| L5 | `guard-signup` | `index.ts:135` | `hibpErr.message` كامل في `console.warn` |

### 🔵 معلوماتية (4 ملاحظات)

| # | الدالة | الملف:السطر | الوصف |
|---|--------|------------|-------|
| I1 | `health-check` | `index.ts:24` | يستخدم SERVICE_ROLE_KEY للقراءة البسيطة — يكفي ANON_KEY |
| I2 | `beneficiary-summary` | `index.ts:46` | يجلب `bank_account` في الـ SELECT لكن لا يُعيده — يُفضَّل حذفه |
| I3 | `auth-email-hook` | `index.ts:83` | CORS `*` في `/preview` — مقصود ومحمي بـ API key |
| I4 | `check-contract-expiry` | `index.ts:5` | لا Zod validation (لا body parameters) — مقبول |

---

## دليل الأدلة المرجعية

| الدليل | الملف:السطر | الملاحظة |
|--------|------------|----------|
| `getUser()` موحّد | `_shared/auth.ts:97` | `await userClient.auth.getUser()` |
| `getSession()` غائب | — | `rg -rn "getSession" supabase/functions/` → 0 نتائج |
| CORS محكوم مركزياً | `_shared/cors.ts:27` | `getCorsHeaders()` مع whitelist صارمة |
| فصل العميلين | `_shared/auth.ts:82,115` | `userClient` (ANON) vs `admin` (SERVICE_ROLE) |
| isServiceRole آمنة | `_shared/auth.ts:210-218` | مقارنة ثابتة الزمن (constant-time) |
| M1 دليل | `auth-email-hook/index.ts:317` | `console.error('Webhook handler error:', error)` |
| M2 دليل | `email-admin/index.ts:149` | `JSON.stringify({ ok: true, moved: movedCount, error: lastError })` |

---

## التوصيات الفورية (مرتبة حسب الأولوية)

1. **[M1]** في `auth-email-hook/index.ts:317` — استبدل `error` بـ `error instanceof Error ? error.message : 'unknown'`
2. **[M2]** في `email-admin/index.ts:149` — لا تُعد `lastError` للعميل؛ أعد رسالة عامة مثل `"فشل نقل رسائل DLQ"` وسجّل التفاصيل داخلياً
3. **[L1-L3]** في `zatca-signer:249`, `zatca-onboard:126`, `zatca-renew:88` — فلتر رسائل الخطأ الـ cryptographic قبل تسجيلها
4. **[I1]** في `health-check/index.ts:24` — استخدم ANON_KEY بدلاً من SERVICE_ROLE_KEY للقراءة في health check
5. **[I2]** في `beneficiary-summary/index.ts:46` — أزل `bank_account, phone, email` من الـ `select()` إن لم تُستخدم في الاستجابة

---

*تم إنتاج هذا التقرير بفحص يدوي+جنائي لـ 21 ملف index.ts + ملفات handlers وhelpers المرتبطة. لا تعديل على أي كود.*
