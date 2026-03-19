

# تشخيص: فشل تسجيل الدخول بعد تحديث كلمة المرور من لوحة الناظر

## ما تم التحقق منه

| الفحص | النتيجة |
|-------|---------|
| `lookup_by_national_id` (البحث بالهوية) | ✅ يعمل — يجد الهوية ويُرجع البريد الصحيح |
| تطابق البريد بين `beneficiaries` و `auth.users` | ✅ متطابق لجميع الـ 14 مستفيد |
| تأكيد البريد (`email_confirmed_at`) | ✅ جميعهم مؤكدون |
| تدفق `update_password` في Edge Function | ✅ لا أخطاء مسجلة |
| اختبار مباشر للدخول | ❌ يُرجع `"كلمة المرور غير صحيحة"` |

## السبب الجذري المرجح

وظيفة `update_password` في Edge Function تستدعي `updateUserById(userId, { password })` **بدون أي تحقق من نجاح التحديث الفعلي**. الاحتمالات:

1. **GoTrue يرفض كلمة المرور بسبب HaveIBeenPwned** — GoTrue مُفعّل عليه فحص كلمات المرور المُسربة (Pwned passwords cache: 292 KB). إذا اختار الناظر كلمة مرور شائعة أو مسربة، قد يُرفض التحديث بخطأ لا يظهر بوضوح في الواجهة
2. **خطأ صامت من SDK** — `updateUserById` قد يُرجع خطأ بصيغة غير متوقعة لا يلتقطها الكود الحالي

الحل: إضافة **تحقق مباشر** بعد تحديث كلمة المرور — محاولة تسجيل دخول تجريبية بالبيانات الجديدة للتأكد من نجاح التحديث فعلياً.

---

## خطة الإصلاح

### 1. Edge Function: إضافة تحقق بعد تحديث كلمة المرور
**الملف**: `supabase/functions/admin-manage-users/index.ts`

بعد `updateUserById(userId, { password })` الناجح:
- جلب بريد المستخدم عبر `adminClient.auth.admin.getUserById(userId)`
- محاولة تسجيل دخول تجريبية عبر `POST /auth/v1/token?grant_type=password`
- إذا فشل الدخول التجريبي → إرجاع خطأ واضح للناظر: "فشل تحديث كلمة المرور — جرّب كلمة مرور أقوى"
- تسجيل خروج الجلسة التجريبية فوراً بعد التحقق

### 2. Edge Function: تسجيل تفصيلي للأخطاء
**الملف**: `supabase/functions/admin-manage-users/index.ts`

إضافة `console.log` لنتيجة `updateUserById` لتسهيل التشخيص المستقبلي.

### 3. واجهة الناظر: تحسين حوار تغيير كلمة المرور
**الملف**: `src/pages/dashboard/UserManagementPage.tsx`

- إضافة زر إظهار/إخفاء كلمة المرور (eye toggle) لمنع أخطاء الإدخال
- إضافة متطلبات واضحة (8+ أحرف، أحرف وأرقام)

---

## التفاصيل التقنية

| # | الملف | التعديل |
|---|-------|---------|
| 1 | `supabase/functions/admin-manage-users/index.ts` | إضافة تحقق تسجيل دخول تجريبي بعد `updateUserById` + تسجيل خروج فوري |
| 2 | `supabase/functions/admin-manage-users/index.ts` | إضافة `console.log` لنتائج التحديث |
| 3 | `src/pages/dashboard/UserManagementPage.tsx` | إضافة toggle إظهار كلمة المرور + رسائل متطلبات |

