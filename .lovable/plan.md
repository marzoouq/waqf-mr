

# خطة إصلاح البنود الثلاثة المتبقية (منخفضة التأثير)

بعد التحقق الجنائي من الكود الفعلي، تبيّن أن 4 من 7 ادعاءات خاطئة (تستشهد بكود قديم مُصلَح). البنود الثلاثة المتبقية كلها تتعلق بخصوصية server logs.

---

## البنود المؤكدة

### 1. `guard-signup/index.ts` سطر 37 — `rlError.message` في console.error
- **الحالة:** يُسجّل تفاصيل خطأ rate limit الداخلية في server logs
- **الإصلاح:** إزالة `.message` من `console.error("rate_limit check failed:", rlError.message)` ليصبح `console.error("rate_limit check failed")`
- **التأثير:** منخفض — logs فقط

### 2. `auth-email-hook/index.ts` سطر 208 — يُسجّل البريد الإلكتروني
- **الحالة:** `console.log('Received auth event', { emailType, email: payload.data.email, run_id })` يُظهر البريد في server logs
- **الإصلاح:** إزالة `email` من الكائن المُسجّل: `console.log('Received auth event', { emailType, run_id })`
- **التأثير:** منخفض — تحسين خصوصية

### 3. `guard-signup/index.ts` سطر 28 — IP fallback `"unknown"`
- **الحالة:** كل الطلبات بدون `x-forwarded-for` تشترك في bucket rate limit واحد
- **الإصلاح:** لا يحتاج تغيير كود — Lovable Cloud proxy يضيف header دائماً. يمكن تحسينه بتغيير fallback إلى hash من headers أخرى متاحة لتمييز الطلبات بشكل أفضل، لكن الأثر العملي شبه معدوم

---

## ملخص التغييرات

| الملف | التغيير |
|-------|---------|
| `supabase/functions/guard-signup/index.ts` | حذف `.message` من سطر 37 |
| `supabase/functions/auth-email-hook/index.ts` | حذف `email` من log سطر 208 |

ملاحظة: البند الثالث (IP fallback) لا يحتاج تغيير فعلي — البيئة الحالية تضمن وجود header دائماً.

