
# إصلاح مشكلة تسجيل الدخول في الإنتاج -- تحليل جنائي

## السبب الجذري المؤكد (من سجلات الإنتاج)

سجل `access_log` في قاعدة بيانات الإنتاج يكشف النمط التالي:

```text
02:51:13 - alkayala15 → login_success
02:52:55 - alkayala15 → login_success  (محاولة ثانية!)
02:53:39 - unauthorized_access → current_role: null
03:01:37 - unauthorized_access → current_role: null
03:07:34 - unauthorized_access → current_role: null
03:23:37 - idle_logout
```

**التسلسل**: تسجيل دخول ناجح (الخادم يرد 200) ← لكن الدور (`role`) يبقى `null` ← التوجيه يفشل ← المستخدم يعلق.

## الأسباب التقنية الثلاثة

### السبب 1: عمل غير متزامن داخل `onAuthStateChange` (خطأ معماري)
`AuthContext.tsx` ينفّذ `await fetchUserRole()` داخل callback الـ `onAuthStateChange`. مكتبة Supabase لا تنتظر (`await`) هذا الـ callback. إذا أطلقت أحداث متعددة بسرعة (مثل `SIGNED_IN` ثم `TOKEN_REFRESHED`)، تتداخل الاستدعاءات وتسبب سباق حالة (race condition) يجعل الدور يبقى `null`.

### السبب 2: `ProtectedRoute` يعلّق للأبد عندما الدور `null`
عندما `role = null`، المتغير `isRoleLoading` يكون `true` → يعرض spinner للأبد بدون timeout. المستخدم يرى شاشة تحميل لا تنتهي.

### السبب 3: الـ fallback في Auth.tsx بعد 3 ثوانٍ يوجّه بدون التحقق من الدور في Context
الـ fallback يوجّه المستخدم إلى `/beneficiary` أو `/dashboard`، لكن `ProtectedRoute` هناك يجد `role = null` فيعلّقه مرة أخرى.

## خطة الإصلاح

### الخطوة 1: إعادة هيكلة `AuthContext.tsx` -- فصل جلب الدور عن `onAuthStateChange`

المنطق الجديد:
- `onAuthStateChange` يقوم **فقط** بتحديث `user` و `session` (متزامن، بدون await)
- جلب الدور يتم في `useEffect` منفصل يراقب تغيّر `user`
- إضافة timeout احتياطي (5 ثوانٍ) يضمن أن `loading` يصبح `false` دائماً

```text
onAuthStateChange:
  → setUser, setSession (فوري)
  → setLoading(false) فقط إذا لا يوجد مستخدم

useEffect([user]):
  → إذا يوجد مستخدم → fetchUserRole مع try/catch
  → بعد الانتهاء (نجاح أو فشل) → setLoading(false)
  → timeout 5 ثوانٍ كشبكة أمان
```

### الخطوة 2: إضافة timeout في `ProtectedRoute`

عندما `isRoleLoading = true`، بدلاً من spinner للأبد:
- عرض spinner لمدة 5 ثوانٍ كحد أقصى
- بعدها محاولة أخيرة لجلب الدور مباشرة
- إذا فشل → توجيه إلى `/auth` مع رسالة خطأ

### الخطوة 3: تحسين منطق التوجيه في `Auth.tsx`

- إذا `user` موجود و `role` موجود → توجيه فوري
- إذا `user` موجود و `role = null` بعد 3 ثوانٍ → محاولة أخيرة بـ try/catch ثم توجيه بناءً على النتيجة
- إذا فشل كل شيء → إظهار رسالة خطأ واضحة بدلاً من الانتظار الصامت

### الخطوة 4: إضافة سجلات تشخيصية مؤقتة

إضافة `console.warn` في النقاط الحرجة لتتبع المشكلة في الإنتاج:
- عند إطلاق `onAuthStateChange` (نوع الحدث)
- عند بدء وانتهاء `fetchUserRole` (نجاح/فشل)
- عند تفعيل أي fallback أو timeout

## الملفات المتأثرة

1. `src/contexts/AuthContext.tsx` -- إعادة هيكلة جلب الدور
2. `src/components/ProtectedRoute.tsx` -- إضافة timeout لحالة `isRoleLoading`
3. `src/pages/Auth.tsx` -- تحسين fallback مع error handling

## النتيجة المتوقعة

- تسجيل الدخول يعمل خلال 1-2 ثانية (الحالة الطبيعية)
- في حالة فشل جلب الدور: timeout واضح مع رسالة خطأ بدلاً من تعليق صامت
- لا يوجد سيناريو يعلق فيه المستخدم للأبد
