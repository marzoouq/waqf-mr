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

`verify_jwt = false` متعمَّد لكل الدوال (Lovable Cloud signing-keys).
المصادقة يدوية داخل كل function عبر `supabase.auth.getUser(jwt)`. لا تستخدم
`getSession()` ولا `SUPABASE_SERVICE_ROLE_KEY` كبديل عن مصادقة المستخدم.

## تصنيف الوظائف بحسب نمط الاستدعاء

| Function | المستدعي | CORS | ملاحظات |
|----------|---------|------|--------|
| `admin-manage-users` | متصفح (admin) | shared | — |
| `ai-assistant` | متصفح (auth) | shared | — |
| `auth-email-hook` | Supabase Auth Hook (server-to-server) + Lovable preview tool | shared للـ webhook، `*` لمسار `/preview` فقط | الـ webhook يتطلب `x-lovable-signature`/`x-lovable-timestamp` |
| `beneficiary-summary` | متصفح (auth) | shared | — |
| `check-contract-expiry` | cron + متصفح (admin) | shared | — |
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
- **Method:** POST · **Auth:** admin أو `cron_secret` header.
- **Body:** `{}` أو `{ days_ahead?: number }`
- **Response:** `{ checked: number, notified: number }`

### 6. `dashboard-summary`
- **الغرض:** RPC مُجمّعة للوحة قيادة الناظر/المحاسب (KPIs + YoY + pending advances).
- **Method:** POST · **Auth:** admin/accountant.
- **Body:** `{ fiscal_year_id: string, fiscal_year_label?: string }`
- **Response:** `DashboardSummaryResponse` (راجع `src/types/financial/dashboard.ts`)
- **سلوك خاص:** عند 401 يُستدعى `onAuthError` → `signOut()` تلقائياً.

### 7. `email-admin`
- **الغرض:** إعادة إرسال/إعادة تشغيل عناصر طابور البريد.
- **Method:** POST · **Auth:** admin.
- **Body:** `{ action: 'list'|'retry'|'cancel', id?: string }`

### 8. `generate-invoice-pdf`
- **الغرض:** توليد PDF للفاتورة بالعربية (jsPDF + Amiri).
- **Method:** POST · **Auth:** admin/accountant/المستفيد المعني.
- **Body:** `{ invoice_id: string, table?: 'payment_invoices'|'invoices' }`
- **Response:** `{ pdf_base64: string, file_name: string }`

### 9. `guard-signup`
- **الغرض:** ضبط تسجيل المستخدمين الجدد (whitelist، captcha).
- **Method:** POST · **Auth:** anon (قبل التسجيل).
- **Body:** `{ email, national_id?, phone? }`
- **Response:** `{ allowed: boolean, reason?: string }`

### 10. `health-check`
- **الغرض:** فحص حياة المنصة (uptime).
- **Method:** GET · **Auth:** none.
- **Response:** `{ status: 'ok', uptime_ms: number }`

### 11. `lookup-national-id`
- **الغرض:** استخراج البريد الإلكتروني من رقم الهوية + التحقق من كلمة المرور (دخول بالهوية).
- **Method:** POST · **Auth:** anon.
- **Body:** `{ national_id: string, password: string }`
- **Response:** `{ email?: string, error?: string, retry_after?: number, remaining?: number }`
- **سلوك خاص:** يُطبّق rate-limit عبر `IP+national_id`؛ يرجِع 429 مع `retry_after`.

### 12. `process-email-queue`
- **الغرض:** معالجة طابور البريد (cron فقط).
- **Method:** POST · **Auth:** `cron_secret`.
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
