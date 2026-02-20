
# خطة إصلاح مشكلة "غير مصرح" وتحسين سرعة المساعد الذكي

## المشكلة الاولى: "غير مصرح" عند تحديث التطبيق

### السبب الجذري (مؤكد بالفحص)

في `AuthContext.tsx` سطر 58-64، يوجد **Race Condition**:

```text
onAuthStateChange يُطلق:
  1. setUser(session.user)        -- فوري
  2. setTimeout(fetchUserRole)    -- مؤجل (ينتظر دوره)
  3. setLoading(false)            -- فوري (قبل جلب الدور!)

النتيجة: user موجود + role = null + loading = false
ProtectedRoute يرى: مستخدم بدون دور = "غير مصرح" --> يحول لـ /unauthorized
```

هذا يحدث عند:
- تحديث الصفحة
- تفعيل Service Worker جديد (بعد تفعيل skipWaiting + clientsClaim)
- انتهاء صلاحية الـ Refresh Token

### الاصلاح

**ملف 1: `src/contexts/AuthContext.tsx`**

ازالة `setTimeout` وتاخير `setLoading(false)` حتى يكتمل جلب الدور:

```text
المنطق الحالي (معيب):
  setTimeout(fetchUserRole) --> setLoading(false)

المنطق الجديد (صحيح):
  await fetchUserRole() --> setLoading(false)
```

التغييرات:
- تعديل `fetchUserRole` ليُرجع Promise (هو بالفعل async)
- في `onAuthStateChange`: ازالة `setTimeout`، وتشغيل `fetchUserRole` ثم `setLoading(false)` بعد اكتمالها
- في `getSession`: نفس التعديل
- اضافة `roleLoading` state منفصل كحماية اضافية

**ملف 2: `src/components/ProtectedRoute.tsx`**

اضافة حماية ثانية: اذا `user` موجود و `role === null` (لم يُجلب بعد)، اعتبره حالة تحميل:

```text
قبل:
  isUnauthorized = !loading && !!user && !!allowedRoles && (!role || ...)

بعد:
  // اذا المستخدم موجود لكن الدور لم يصل بعد = لا تزال التحميل
  if (!loading && user && !role && allowedRoles) return <Loader />
```

---

## المشكلة الثانية: بطء المساعد الذكي

### السبب (مؤكد بالفحص)

في `supabase/functions/ai-assistant/index.ts` سطر 78:
```text
model: "google/gemini-2.5-pro"  -- يُستخدم لكل الطلبات
```

`gemini-2.5-pro` هو الاثقل والابطا. للمحادثات العادية والتقارير لا حاجة له.

### الاصلاح

**ملف 3: `supabase/functions/ai-assistant/index.ts`**

تغيير النموذج حسب الوضع:
- وضع `analysis` (تحليل مالي): يبقى `google/gemini-2.5-pro`
- وضع `chat` و `report`: يتحول الى `google/gemini-2.5-flash` (اسرع 3-5 مرات)

```text
const model = mode === "analysis"
  ? "google/gemini-2.5-pro"
  : "google/gemini-2.5-flash";
```

---

## ملخص الملفات المتاثرة

| الملف | التغيير |
|-------|---------|
| `src/contexts/AuthContext.tsx` | ازالة setTimeout، تاخير setLoading حتى اكتمال جلب الدور |
| `src/components/ProtectedRoute.tsx` | اضافة حالة "انتظار الدور" كحماية اضافية |
| `supabase/functions/ai-assistant/index.ts` | تغيير النموذج الى flash للمحادثات العادية |

## النتائج المتوقعة
- لن تظهر صفحة "غير مصرح" عند تحديث التطبيق او تجديد الجلسة
- المساعد الذكي سيستجيب اسرع 3-5 مرات للمحادثات العادية
- التحليل المالي يبقى بنفس الدقة (يستخدم النموذج الثقيل)
