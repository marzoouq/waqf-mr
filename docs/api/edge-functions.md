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

