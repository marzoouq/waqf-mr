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

## القائمة

| Function | الغرض | تتطلب JWT؟ |
|----------|-------|-----------|
| `dashboard-summary` | لوحات قيادة admin/accountant | نعم |
| `guard-signup` | تقييد التسجيل | لا (anon) |
| `webauthn-*` | المصادقة الحيوية | جزئي |
| `zatca-*` | تقارير ZATCA + ECDSA | نعم (admin) |
| `send-email-*` | بريد المعاملات | نعم (admin) |

> راجع المجلدات تحت `supabase/functions/` لأحدث قائمة فعلية.
