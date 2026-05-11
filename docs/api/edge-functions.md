# Edge Functions Reference

## CORS

كل الاستجابات (نجاح وخطأ) يجب أن تستخدم `getCorsHeaders(req)` من
`supabase/functions/_shared/cors.ts`. الرؤوس الأساسية:

- `Access-Control-Allow-Origin`: يُحسب ديناميكياً من `ALLOWED_ORIGINS` و
  `ALLOWED_ORIGIN_PATTERNS` (origins مرفوضة تتلقى سلسلة فارغة ⇒ المتصفح يرفض الطلب).
- `Access-Control-Allow-Headers`: مطابق لما يرسله الكلاينت (`@supabase/supabase-js`).
- `Access-Control-Allow-Methods`: `POST, GET, OPTIONS, PUT, DELETE`.
- `Vary: Origin` — يضمن الكاش الصحيح عبر CDN/المتصفح لأكثر من origin.

## Origins المسموحة

| Origin | الغرض |
|--------|-------|
| `https://waqf-wise.net` / `https://www.waqf-wise.net` | الإنتاج (نطاق مخصص) |
| `https://waqf-wise-net.lovable.app` | البيئة المنشورة |
| `https://(id-preview--)?<project-uuid>.lovable.app` | معاينة Lovable |
| `https://(id-preview--)?<project-uuid>.lovableproject.com` | sandbox Lovable |

## نمط المصادقة

`verify_jwt` افتراضياً `false` لكل الدوال (Lovable Cloud signing-keys) مع استثناء واحد موثّق:

| Function | `verify_jwt` | المصدر |
|---|:-:|---|
| `process-email-queue` | **`true`** | `supabase/config.toml` — يضمن أن البوابة ترفض الطلبات بدون service_role JWT قبل الوصول للكود |
| كل الدوال الأخرى (16 دالة) | `false` | المصادقة يدوية في الكود |

المصادقة الفعلية تُجرى يدوياً داخل كل function — إما عبر `supabase.auth.getUser(jwt)` (مستخدمون عاديون) أو عبر `isServiceRole(token)` من `_shared/auth.ts` (cron / service_role). لا تستخدم `getSession()` ولا `SUPABASE_SERVICE_ROLE_KEY` كبديل عن مصادقة المستخدم.

## تصنيف الوظائف بحسب نمط الاستدعاء

| Function | المستدعي | CORS | ملاحظات |
|----------|---------|------|--------|
| `admin-manage-users` | متصفح (admin) | shared | — |
| `ai-assistant` | متصفح (auth) | shared | — |
| `auth-email-hook` | Supabase Auth Hook (server-to-server) + Lovable preview tool | shared للـ webhook، `*` لمسار `/preview` فقط | الـ webhook يتطلب `x-lovable-signature`/`x-lovable-timestamp` |
| `beneficiary-summary` | متصفح (auth) | shared | — |
| `check-contract-expiry` | cron (service_role JWT) + متصفح (admin user) | shared | يقبل المسارين عبر `isServiceRole()` أو فحص دور admin |
| `dashboard-summary` | متصفح (auth) | shared | — |
| `email-admin` | متصفح (admin) | shared | — |
| `generate-invoice-pdf` | متصفح (auth) | shared | — |
| `guard-signup` | متصفح (anon) | shared | — |
| `health-check` | uptime/monitoring | shared | — |
| `lookup-national-id` | متصفح (anon قبل التسجيل) | shared | — |
| `process-email-queue` | **cron-only** (pg_cron عبر pg_net) | shared (دفاع عميق) | لا متصفحات |
| `webauthn` | متصفح (auth) | shared | — |
| `zatca-onboard` / `zatca-renew` / `zatca-report` / `zatca-signer` / `zatca-xml-generator` | متصفح (admin) | shared | — |

### قاعدة `Vary: Origin`

ضرورية لأن `Access-Control-Allow-Origin` يتغيّر حسب الـ origin المطلوب.
بدونها قد يُخزّن CDN/المتصفح استجابة لـ origin معيّن ويعيدها لـ origin آخر،
مما يُفشل CORS بشكل متقطع.

### استدعاءات السيرفر-إلى-سيرفر

`getCorsHeaders` يُرجع `ALLOWED_ORIGINS[0]` افتراضياً عند غياب `Origin` header.
هذا يدعم Auth Hooks وcron jobs دون فتح ثغرات (المتصفحات دائماً ترسل `Origin`).


---

## مرجع تفصيلي لكل وظيفة

> يُستحسن استدعاء جميع Edge Functions عبر غلاف `invoke()` في `src/lib/api/invoke.ts`
> للحصول على retry، تصنيف خطأ موحّد، ومراقبة الحمولة. راجع `docs/api/README.md`.

### 1. `admin-manage-users`
- **الغرض:** إدارة المستخدمين (إنشاء/تعطيل/تعيين دور).
- **Method:** POST
- **Auth:** Bearer JWT — يجب أن يحمل دور `admin`.
- **Body:** `{ action: 'list'|'create'|'update'|'delete'|'set_role', payload: {...} }`
- **Response:** `{ success: boolean, data?: unknown, error?: string }`
- **رموز الخطأ:** 401 unauthorized · 403 forbidden · 400 validation · 500 server.

### 2. `ai-assistant`
- **الغرض:** بوت محاسبي عبر Lovable AI Gateway.
- **Method:** POST
- **Auth:** Bearer JWT (مستخدم مسجَّل).
- **Body:** `{ messages: ChatMessage[], model?: string }`
- **Response:** stream (SSE) أو `{ reply: string }`
- **الأخطاء:** 401 · 429 rate-limit (يُعاد محاولته تلقائياً) · 402 payment-required.

### 3. `auth-email-hook`
- **الغرض:** webhook من Supabase Auth لإرسال رسائل التحقق/الاستعادة.
- **Method:** POST (server-to-server) + GET `/preview` لأداة Lovable.
- **Auth:** `x-lovable-signature` + `x-lovable-timestamp`.
- **Body:** payload Auth Hook قياسي.
- **Response:** `{ success: true }`
- **الأخطاء:** 401 توقيع غير صحيح · 500 فشل إرسال.

### 4. `beneficiary-summary`
- **الغرض:** ملخّص حصة المستفيد للسنة المختارة.
- **Method:** POST · **Auth:** beneficiary.
- **Body:** `{ fiscal_year_id: string }`
- **Response:** `{ share_amount, advances, carryforward, net_amount, ... }`

### 5. `check-contract-expiry`
- **الغرض:** فحص العقود المنتهية قريباً (cron + يدوي للناظر).
- **Method:** POST · **Auth:** `service_role` JWT (cron — يُتحقَّق منه عبر `isServiceRole()` في الكود) **أو** مستخدم مصادَق له دور `admin` في `user_roles` (متصفح). لا يوجد `cron_secret` header.
- **Body:** `{}` أو `{ days_ahead?: number }`
- **Response:** `{ checked: number, notified: number }`

### 6. `dashboard-summary`
- **الغرض:** RPC مُجمّعة للوحة قيادة الناظر/المحاسب (KPIs + YoY + pending advances).
- **Method:** POST · **Auth:** admin/accountant.
- **Body:** `{ fiscal_year_id: string, fiscal_year_label?: string }`
- **Response:** `DashboardSummaryResponse` (راجع `src/types/financial/dashboard.ts`)
- **سلوك خاص:** عند 401 يُستدعى `onAuthError` → `signOut()` تلقائياً.

### 7. `email-admin`
- **الغرض:** قراءة إحصاءات طابور البريد + إعادة محاولة عناصر DLQ.
- **Method:** POST · **Auth:** admin (يدوي — لا يستخدم `_shared/auth.ts`).
- **Body:** `{ action: 'get_stats' | 'retry_dlq', queueName?: 'auth_emails' | 'transactional_emails' }`
- **Response (`get_stats`):** `{ sent, failed, dlq, suppressed, last_run, auth_dlq_count, transactional_dlq_count, rate_limited_until }`
- **Response (`retry_dlq`):** `{ moved: number }` (يتطلب `queueName` صالح)

### 8. `generate-invoice-pdf`
- **الغرض:** توليد PDF للفاتورة بالعربية (jsPDF + Amiri).
- **Method:** POST · **Auth:** admin/accountant/المستفيد المعني.
- **Body:** `{ invoice_ids: string[], table?: 'payment_invoices'|'invoices' }`
- **Response:** `{ results: Array<{ id: string, invoice_number?: string, success: boolean, error?: string }> }` — يرفع الـ PDF إلى Storage ويُحدّث `file_path/file_name` على الجدول؛ لا يُعيد binary مباشرة.

### 9. `guard-signup`
- **الغرض:** ضبط تسجيل المستخدمين الجدد — يتحقق من `registration_enabled`، صيغة البريد، تعقيد كلمة المرور (8–128، حرف كبير/صغير/رقم)، ومنع التكرار.
- **Method:** POST · **Auth:** anon (قبل التسجيل).
- **Body:** `{ email: string, password: string }`
- **Response (نجاح):** `{ success: true, message: string }` — يُنشئ المستخدم بـ `email_confirm: false` (يحتاج تأكيد بريد قبل تسجيل الدخول).
- **Response (فشل):** `{ error: string }` — رسالة عربية موحّدة.

### 10. `health-check`
- **الغرض:** فحص حياة المنصة + اتصال قاعدة البيانات + متغيرات البيئة.
- **Method:** GET · **Auth:** none.
- **Response:** `{ status: 'healthy' \| 'degraded', timestamp: string }` — HTTP `200` عند `healthy`، `503` عند `degraded`. لا يكشف تفاصيل داخلية.

### 11. `lookup-national-id`
- **الغرض:** البحث عن مستخدم برقم الهوية الوطنية + (اختيارياً) تسجيل دخول مباشر عند تمرير كلمة المرور.
- **Method:** POST · **Auth:** anon.
- **Body:** `{ national_id: string, password?: string }`
- **Response:** `{ found: boolean, masked_email: string \| null, remaining: number, auth_error?: string, session?: { access_token: string, refresh_token: string }, retry_after?: number, error?: string }`
- **خصوصية حرجة:** لا يُعاد البريد الكامل أبداً — `masked_email` فقط (مثل `u***@example.com`) لمنع enumeration. عند `found: false` تُعاد نفس البنية بـ `masked_email: '***@***.com'` (timing-safe).
- **سلوك خاص:** rate-limit عبر `IP+national_id`؛ عند التجاوز تُعاد الاستجابة بـ HTTP 200 + `error` + `retry_after` (وليس HTTP 429) — العميل يقرأ `data.retry_after` يدوياً، لذلك يُستدعى عبر `invoke()` مع `treatDataErrorAsFailure: false` و `maxAttempts: 1`.

### 12. `process-email-queue`
- **الغرض:** معالجة طابور البريد (cron فقط).
- **Method:** POST · **Auth:** `service_role` JWT — يتحقق منه أولاً بوابة Supabase (`verify_jwt = true` في `config.toml`) ثم الكود عبر `isServiceRole(token)` من `_shared/auth.ts`. لا يوجد `cron_secret` header.
- **Body:** `{}`
- **Response:** `{ processed: number, failed: number }`

### 13. `webauthn`
- **الغرض:** تسجيل/مصادقة بصمة WebAuthn.
- **Method:** POST · **Auth:** `register-options`/`auth-options` تتطلب JWT (للتسجيل) أو anon (للمصادقة).
- **Body:** `{ action: 'register-options'|'register-verify'|'auth-options'|'auth-verify', credential?, challenge_id?, deviceName? }`
- **Response (auth-verify):** `{ verified: boolean, access_token?: string, refresh_token?: string }`
- **سلوك خاص:** التحديات تستخدم مرة واحدة — `invoke()` يُستدعى بـ `maxAttempts: 1`.

### 14-18. `zatca-*` (5 وظائف)

| Function | الغرض | Body |
|----------|-------|------|
| `zatca-onboard` | تسجيل CSID/PCSID مع ZATCA | `{ action: 'compliance'|'production' }` |
| `zatca-renew` | تجديد PCSID قبل الانتهاء | `{}` |
| `zatca-xml-generator` | توليد UBL 2.1 XML | `{ invoice_id, table }` |
| `zatca-signer` | توقيع XML عبر ECDSA P-256 + بناء سلسلة ICV | `{ invoice_id, table }` |
| `zatca-report` | إرسال للـ ZATCA (report/clearance/compliance-check) | `{ action, invoice_id, table }` |

كلها: **Auth admin** · **Response:** `{ success, ...details }` أو `{ error: string }`.

## مرجع سريع — مصفوفة الفئات

| Function | retry آمن؟ | يعتمد على `data.error`؟ | يستدعي `onAuthError`؟ |
|----------|-----------|------------------------|----------------------|
| `dashboard-summary` | ✅ | نعم (`Unauthorized`) | ✅ |
| `webauthn` (challenge) | ❌ (`maxAttempts: 1`) | لا (يُفحص `verified`) | ❌ |
| `lookup-national-id` | ❌ (rate-limit حساس) | نعم (`retry_after`) | ❌ |
| `zatca-*` | ✅ | لا | ❌ |
| `generate-invoice-pdf` | ✅ | لا | ❌ |
| `process-email-queue` | ❌ (cron) | لا | ❌ |
| `auth-email-hook` (webhook) | ❌ | لا | ❌ |

## CORS verified matrix (2026-05-11)

تم التحقق ميدانياً عبر `curl -X OPTIONS` من 4 origins × 3 functions تمثيلية.
كل سطر يعكس قيمة header `Access-Control-Allow-Origin` المُعادة. `Vary: Origin`
حاضر في كل الاستجابات.

| Function | waqf-wise.net | id-preview-*.lovable.app | *.lovableproject.com | malicious.example.com |
|----------|:-:|:-:|:-:|:-:|
| `dashboard-summary` | ✅ مرآة | ✅ مرآة | ✅ مرآة | ❌ فارغ (مرفوض) |
| `lookup-national-id` | ✅ مرآة | ✅ مرآة | ✅ مرآة | ❌ فارغ (مرفوض) |
| `process-email-queue` | ✅ مرآة | ✅ مرآة | ✅ مرآة | ❌ فارغ (مرفوض) |

**ملاحظة:** الردّ HTTP 200 لـ malicious origin، لكن `Access-Control-Allow-Origin`
يُعاد فارغاً ⇒ المتصفح يرفض الطلب تلقائياً (سلوك CORS متوقع وآمن).

## ملاحظات drift توثيقية مُصلَحة

- **`generate-invoice-pdf`**: الاستجابة هي `{ results: Array<{id, invoice_number, success, error?}> }`،
  وليس ملف PDF binary. الدالة ترفع PDF إلى Storage وتُحدّث `file_path/file_name`
  على الجدول. أي ادعاء قديم بخلاف ذلك في `docs/API.md` يُلغى لصالح هذا التوثيق.
