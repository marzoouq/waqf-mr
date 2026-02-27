

# خطة تحسينات طفيفة متبقية بعد التحقق الجنائي

## نتائج التحقق

تم فحص كل بند في التقرير مقابل الكود الفعلي. الخلاصة:

- **`logger.info`** في `AuthContext.tsx`: تم تنفيذه بالفعل (سطر 55 و59 يستخدمان `logger.info`)
- **`DataExportTab`** يحتوي `.limit(5000)` في سطر 58 و80: مُنفَّذ بالفعل
- **`staleTime`** في `useCrudFactory`: مُنفَّذ بالفعل
- **`ALLOWED_ORIGINS`** موحَّدة: مُنفَّذ بالفعل

## المشاكل المتبقية الحقيقية (تحسينات طفيفة)

### الإصلاح 1: رفع الحد الأدنى لكلمة المرور من 6 إلى 8 أحرف

**المشكلة:** 3 ملفات تستخدم الحد الأدنى 6 أحرف وهو أقل من الممارسات الحديثة (NIST توصي بـ 8+).

**الملفات المتأثرة:**
1. `src/pages/Auth.tsx` سطر 200: `signupPassword.length < 6`
2. `src/pages/ResetPassword.tsx` سطر 40: `password.length < 6`
3. `src/pages/dashboard/UserManagementPage.tsx` سطر 513: `newPassword.length < 6`

**التغيير:** تعديل `< 6` الى `< 8` + تحديث رسالة الخطأ في كل موقع.

---

### الإصلاح 2: تنظيف `console.error` في Edge Function

**الملف:** `supabase/functions/lookup-national-id/index.ts` سطر 41

**المشكلة:** `console.error("rate_limit check failed:", rlError.message)` يطبع رسالة الخطأ الكاملة في logs. التأثير منخفض لأن logs الـ Edge Functions لا تُكشف للمستخدم، لكن من باب التنظيف يُفضَّل تقليل المعلومات المطبوعة.

**التغيير:** تغيير الى `console.error("rate_limit check failed")` بدون تفاصيل الخطأ.

---

## ملاحظات لا تحتاج إصلاح

| البند | السبب |
|-------|-------|
| `as unknown as AdvanceRequest[]` | متوقع -- الجدول أُنشئ حديثاً والأنواع تُحدَّث تلقائياً عند النشر |
| `shareBase` بدون خصم الضريبة | قرار محاسبي/فقهي وليس خطأ برمجي |
| `console.error` في Edge Function | خطورة منخفضة جداً (logs داخلية فقط) |

## ترتيب التنفيذ

| # | الإصلاح | الملفات | التعقيد |
|---|---------|---------|---------|
| 1 | رفع حد كلمة المرور لـ 8 | `Auth.tsx` + `ResetPassword.tsx` + `UserManagementPage.tsx` | بسيط (3 تعديلات) |
| 2 | تنظيف console.error | `lookup-national-id/index.ts` | بسيط (سطر واحد) |

## الملفات المتأثرة
1. `src/pages/Auth.tsx`
2. `src/pages/ResetPassword.tsx`
3. `src/pages/dashboard/UserManagementPage.tsx`
4. `supabase/functions/lookup-national-id/index.ts`

