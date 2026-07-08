# سياسة Content Security Policy (CSP)

**آخر مراجعة:** 8 يوليو 2026
**المسؤول:** ناظر الوقف (Admin)
**دورة المراجعة:** كل ربع سنة

## المصدر المرجعي

الرؤوس الأمنية معرَّفة في `public/_headers` وتُطبَّق من طبقة الاستضافة (Lovable Hosting / CDN) عند تسليم الأصول الثابتة.

## القيم الحالية

| الرأس | القيمة | الغرض |
|-------|--------|-------|
| `Content-Security-Policy` | `frame-ancestors 'self'` | منع تضمين التطبيق في iframe خارجي (clickjacking) |
| `X-Frame-Options` | `DENY` | نسخة احتياطية للمتصفحات القديمة |
| `X-Content-Type-Options` | `nosniff` | منع MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | تقليل تسرب الـ referrer |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | تعطيل واجهات الأجهزة |

## لماذا CSP مبسّط؟

- التطبيق SPA يُشغِّل inline scripts من Vite + React + shadcn — سياسة `script-src` صارمة تكسر HMR وlazy chunks.
- الحماية الأساسية من XSS تعتمد على:
  1. TypeScript + Zod validation على كل input.
  2. React escaping التلقائي للـ JSX.
  3. ESLint conventions تمنع `dangerouslySetInnerHTML` خارج نطاقات محددة.
  4. RLS + Edge Function `getUser()` يحميان البيانات حتى مع token مسروق.

## متى نُشدِّد CSP؟

- عند إضافة CDN scripts خارجية (لا شيء حالياً).
- عند دمج مزودي دفع (Stripe/Paddle) — يجب إضافة `script-src` و`frame-src` صريحة.
- عند تفعيل analytics خارجي — يجب إضافة `connect-src` و`img-src`.

## التحقق التشغيلي

```bash
# محلياً (يتطلب preview URL)
curl -sI https://waqf-wise.net | grep -iE "content-security-policy|x-frame-options|permissions-policy"
```

يجب أن تظهر جميع الرؤوس الأربعة أعلاه.

## المراجع

- `public/_headers` — المصدر الوحيد الحقيقي.
- OWASP CSP Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
