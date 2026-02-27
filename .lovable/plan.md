
# إصلاح 7 مشاكل من التقرير الجنائي (نسخة مُدققة ومُحسّنة)

## ملخص
7 إصلاحات تم التحقق منها مقابل الكود الفعلي، مع التعديلات الأربعة المطلوبة من تقرير التحقق.

---

## البند 1 (CRITICAL): حذف isServiceRole bypass من generate-invoice-pdf
**الملف:** `supabase/functions/generate-invoice-pdf/index.ts` سطر 362-401

**المشكلة:** السطر 366 يقارن token مع `SUPABASE_SERVICE_ROLE_KEY` مباشرة، مما يسمح بتجاوز المصادقة.

**الإصلاح:**
- حذف `isServiceRole` والمتغير `token` (سطر 363, 366-367, 401)
- نقل `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` إلى ما بعد التحقق من الهوية
- إبقاء منطق `getUser()` + role check كما هو لكن بدون الشرط `if (!isServiceRole)`

---

## البند 2 (HIGH): إضافة pagination لـ list_users
**الملف:** `supabase/functions/admin-manage-users/index.ts` سطر 102-118

**المشكلة:** `perPage: 500` + جلب كل `user_roles` دفعة واحدة.

**الإصلاح:**
- قبول `page` من body (افتراضي 1)
- تخفيض `perPage` إلى 50
- تصفية `user_roles` بـ `.in('user_id', userIds)` بدلاً من جلب الكل
- إرجاع `total` و `nextPage` في الاستجابة

---

## البند 3 (MEDIUM): إصلاح window.location.href في ProtectedRoute
**الملف:** `src/components/ProtectedRoute.tsx` سطر 80-83

**المشكلة:** `window.location.href = '/auth'` يسبب full page reload.

**الإصلاح:**
- استيراد `useNavigate` (موجود أصلاً عبر `useLocation`)
- استبدال `window.location.href = '/auth'` بـ `navigate('/auth', { replace: true })`
- `signOut()` ينظف الجلسة و AuthContext تلقائياً، لا حاجة لـ reload

---

## البند 4 (MEDIUM): إضافة معالجة أخطاء لـ fetchCredentials
**الملف:** `src/hooks/useWebAuthn.ts` سطر 22-29

**المشكلة:** `error` من Supabase مُتجاهَل تماماً.

**الإصلاح:**
```text
const { data, error } = await supabase...
if (error) {
  console.error('Failed to fetch credentials:', error.message);
  toast.error('تعذر جلب بيانات الاعتماد');
  return [];
}
```

---

## البند 5 (LOW): إضافة مؤشر اقتطاع لوصف الفاتورة
**الملف:** `supabase/functions/generate-invoice-pdf/index.ts` سطر 298

**المشكلة:** الوصف يُقطع عند 50 حرف بصمت.

**الإصلاح:**
```text
const desc = invoice.description || "—";
["الوصف", desc.length > 47 ? desc.substring(0, 47) + "..." : desc],
```

---

## البند 6 (LOW): تعزيز SecurityGuard بـ selectstart + contextmenu
**الملف:** `src/components/SecurityGuard.tsx`

**الإصلاح:** إضافة handler لـ `selectstart` و `contextmenu` على العناصر `[data-sensitive]`.

---

## البند 7 (LOW): تقليل staleTime للبيانات المالية
**الملف:** `src/hooks/useIncome.ts` سطر 36-37

**الإصلاح:** إضافة `staleTime: 60_000` (دقيقة واحدة) لضمان تحديث البيانات المالية بسرعة.

---

## إضافة: تعليق تحذيري على rate limiting
**الملفات:** `supabase/functions/guard-signup/index.ts` + `supabase/functions/lookup-national-id/index.ts`

**الإصلاح:** إضافة تعليق يوضح أن in-memory rate limiting لا يعمل بشكل موزع عبر instances متعددة.

---

## ترتيب التنفيذ
1. generate-invoice-pdf (حذف isServiceRole + إصلاح وصف) ثم deploy
2. admin-manage-users (pagination) ثم deploy
3. ProtectedRoute (navigate)
4. useWebAuthn (error handling)
5. SecurityGuard (selectstart + contextmenu)
6. useIncome (staleTime)
7. تعليقات rate limiting
