

# خطة إصلاح 4 مشاكل متبقية حقيقية

## ملخص التحقق الجنائي

بعد قراءة كل ملف مذكور سطراً بسطر، تبيّن أن عدة ادعاءات في التقرير كانت خاطئة:
- `DataExportTab` يحتوي `.limit(5000)` فعلاً (سطر 58 و80)
- `ai-assistant` محمي بـ try/catch شامل + `Array.isArray(messages)`
- `useCrudFactory` و `ALLOWED_ORIGINS` أُصلحا في الـ commit السابق

المشاكل الحقيقية المتبقية هي 4 فقط:

---

## الإصلاح 1: `check-contract-expiry` -- مقارنة آمنة للـ service key

**الملف:** `supabase/functions/check-contract-expiry/index.ts` سطر 17

**المشكلة:** `token === serviceKey` مقارنة مباشرة عرضة لـ timing attack نظرياً.

**التغيير:** إضافة دالة `timingSafeEqual(a, b)` تقارن حرفاً حرفاً بوقت ثابت، واستخدامها بدل `===`:

```text
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// سطر 17: بدل token === serviceKey
const isServiceRole = timingSafeEqual(token, serviceKey);
```

---

## الإصلاح 2: `webauthn register-verify` -- استخدام challenge_id

**الملف:** `supabase/functions/webauthn/index.ts` سطور 100-127

**المشكلة:** `auth-verify` يستخدم `challenge_id` لتجنب race condition، لكن `register-verify` لا يزال يستخدم `ORDER BY created_at DESC LIMIT 1`.

**التغيير:**
1. في `reg-options` (سطر 102-109): حفظ الـ challenge ثم إرجاع `challenge_id` في الاستجابة مع الـ options
2. في `register-verify` (سطر 120-127): استقبال `challenge_id` من الطلب واستخدام `.eq("id", challenge_id)` بدل ORDER BY

---

## الإصلاح 3: `ai-assistant` -- إزالة email/phone من استعلام المستفيدين

**الملف:** `supabase/functions/ai-assistant/index.ts` سطر 313-316

**المشكلة:** `email` و `phone` يُجلبان من جدول المستفيدين لكن لا يُستخدمان (سطر 321 يستخدم `name` و `share_percentage` فقط). بالإضافة لعدم وجود `.limit()`.

**التغيير:**
```text
// سطر 314-316: تغيير من
.select("name, share_percentage, email, phone")
.order("share_percentage", { ascending: false });

// إلى
.select("name, share_percentage")
.order("share_percentage", { ascending: false })
.limit(50);
```

---

## الإصلاح 4: `AuthContext` -- تغيير `logger.warn` إلى `logger.info`

**الملف:** `src/contexts/AuthContext.tsx` سطر 55 و59

**المشكلة:** أحداث auth عادية (`SIGNED_IN`, `INITIAL_SESSION`) تُسجَّل كـ `warn` بدل `info`.

**التغيير:**
- سطر 55: `logger.warn(...)` يتغير إلى `logger.info(...)`
- سطر 59: `logger.warn(...)` يتغير إلى `logger.info(...)`

---

## ترتيب التنفيذ

| # | الإصلاح | الملف | التعقيد |
|---|---------|-------|---------|
| 1 | timing-safe comparison | `check-contract-expiry/index.ts` | بسيط (+10 سطور) |
| 2 | challenge_id في register | `webauthn/index.ts` | متوسط (~12 سطر) |
| 3 | إزالة email/phone + limit | `ai-assistant/index.ts` | بسيط (تعديل سطرين) |
| 4 | logger.warn الى info | `AuthContext.tsx` | بسيط (تعديل سطرين) |

## الملفات المتأثرة
1. `supabase/functions/check-contract-expiry/index.ts`
2. `supabase/functions/webauthn/index.ts`
3. `supabase/functions/ai-assistant/index.ts`
4. `src/contexts/AuthContext.tsx`
