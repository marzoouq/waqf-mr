
# خطة إصلاح المشاكل المتبقية بعد الفحص الجنائي الشامل

## ملخص الوضع الحالي

من أصل الإصلاحات الأربع السابقة، تم تنفيذ 4/4 بنجاح. لكن الفحص الشامل كشف عن مشكلتين جديدتين وملاحظة تجميلية.

---

## الإصلاح 1 (أولوية عالية): نقل rate limiting في `guard-signup` إلى قاعدة البيانات

**الملف:** `supabase/functions/guard-signup/index.ts`

**المشكلة:** يستخدم `Map` في الذاكرة + `setInterval` للـ rate limiting -- نفس المشكلة التي أُصلحت في `lookup-national-id` لكن لم تُصلح هنا. الكود نفسه يحمل تحذير `WARNING` صريح.

**التغيير:**
- حذف السطور 6-29 (المتغيرات `signupRateLimitMap`، دالة `isSignupRateLimited`، `setInterval`)
- استبدال استدعاء `isSignupRateLimited(clientIp)` في السطر 46 باستدعاء `check_rate_limit` RPC عبر `supabaseAdmin` مع سياسة fail-closed
- نقل إنشاء `supabaseAdmin` client قبل استدعاء rate limit (حاليا في السطر 70)

---

## الإصلاح 2 (أولوية منخفضة): إضافة rate limiting لـ `ai-assistant`

**الملف:** `supabase/functions/ai-assistant/index.ts`

**المشكلة:** المستخدم المصادق يمكنه إرسال طلبات AI بلا حد. الحماية الموجودة (`slice(-20)` و `slice(0, 4000)`) تحد من حجم الطلب الواحد لكن لا تمنع الاستنزاف عبر طلبات كثيرة.

**التغيير:**
- بعد التحقق من المستخدم (سطر 31)، إضافة استدعاء `check_rate_limit` بمفتاح `ai:${userId}` وحد 30 طلب/دقيقة
- سياسة fail-closed (إرجاع 503 عند فشل RPC)

---

## الإصلاح 3 (تجميلي): حذف نطاق preview القديم من `cors.ts`

**الملف:** `supabase/functions/_shared/cors.ts`

**المشكلة:** نطاق `id-preview--29470216...lovable.app` لا يزال في القائمة رغم أن الـ regex يغطيه. تنظيف بسيط.

**التغيير:** حذف السطر 3 من مصفوفة `ALLOWED_ORIGINS`

---

## ترتيب التنفيذ

| # | الإصلاح | الملف | الأولوية |
|---|---|---|---|
| 1 | نقل rate limiting لـ DB في guard-signup | `guard-signup/index.ts` | عالية |
| 2 | إضافة rate limiting لـ ai-assistant | `ai-assistant/index.ts` | متوسطة |
| 3 | حذف نطاق preview قديم | `_shared/cors.ts` | منخفضة |

## الملفات المتأثرة
1. `supabase/functions/guard-signup/index.ts`
2. `supabase/functions/ai-assistant/index.ts`
3. `supabase/functions/_shared/cors.ts`

## ملاحظة
دالة `check_rate_limit` وجدول `rate_limits` موجودان بالفعل في قاعدة البيانات -- لا حاجة لـ migration جديد.
