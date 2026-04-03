
# خطة إصلاح تصلب الشاشة والتجمد بعد تسجيل الدخول

## التحليل الأولي بعد قراءة الكود الفعلي

بعد قراءة الملفات الخمسة، الوضع أفضل مما يوحي التقرير في بعض النقاط، وأسوأ في أخرى:

### ما هو جيد فعلاً:
- `AuthContext.tsx` يستخدم `roleFetchIdRef` لمنع race conditions بين الطلبات المتعددة ✅
- `ProtectedRoute.tsx` يفصل بين حالات `loading`, `!user`, `!role`, `unauthorized` بشكل واضح ✅
- `useAdminDashboardData.ts` يستخدم `useMemo` على كل حساب (ليس synchronous blocking كما يوحي التقرير) ✅
- `RequirePermission.tsx` يستثني admin تماماً (`role === 'admin'`) ✅

### المشاكل الفعلية المؤكدة:

1. **Safety Timeout 3s في AuthContext** — المشكلة الحقيقية: الـ timeout يفرض `setLoading(false)` قبل اكتمال جلب الدور، مما يتسبب في دخول `ProtectedRoute` لحالة `role=null` → شاشة "جاري التحقق" → auto-logout بعد 10 ثوانٍ
2. **`useEffect` navigation في RequirePermission** — إذا كان `role` لم يُجلب بعد (null)، و`isRouteAllowed` يُرجع false، يحدث redirect مبكر
3. **Auto-logout 10s في ProtectedRoute** — قاسٍ جداً، خاصة مع شبكات بطيئة

---

## الخطة (4 مراحل مرتبة حسب الأولوية):

### المرحلة 1: إصلاح AuthContext — إزالة Safety Timeout (الأكثر أهمية)
**الملف:** `src/contexts/AuthContext.tsx`

**التغيير:**
- إزالة الـ `setTimeout` 3 ثوانٍ (سطر 126-131) الذي يفرض `setLoading(false)` مبكراً
- `setLoading(false)` يجب أن يحدث **فقط** في مسارين: نجاح جلب الدور (سطر 149) أو فشل كل المحاولات (سطر 174)
- هذا يضمن أن `loading` لا يصبح `false` أبداً بينما `role` لا يزال `null` ولم تفشل كل المحاولات

**لماذا آمن؟** لأن الـ retry loop (3 محاولات × 300ms تصاعدي) تنتهي خلال ~2 ثانية تقريباً. لا حاجة لـ timeout إضافي.

### المرحلة 2: إصلاح ProtectedRoute — زيادة timeout وتحسين UX
**الملف:** `src/components/auth/ProtectedRoute.tsx`

**التغييرات:**
- زيادة timeout إظهار زر الخروج من 3s → 5s
- زيادة timeout الخروج التلقائي من 10s → 20s (أو إزالته تماماً والاكتفاء بالزر اليدوي)
- هذا التغيير أقل أهمية بعد إصلاح المرحلة 1 (لأن `role=null + loading=false` لن تحدث إلا عند فشل حقيقي)

### المرحلة 3: إصلاح RequirePermission — منع التوجيه عند عدم وجود role
**الملف:** `src/components/guards/RequirePermission.tsx`

**التغيير:**
- إضافة فحص `if (!role) return children` — إذا لم يُجلب الدور بعد، اعرض المحتوى (لأن `ProtectedRoute` الأب يتعامل مع حالة `!role` بالفعل)
- أو الأفضل: عدم تنفيذ `navigate` إذا كان `role === null` (فقط عند وجود role فعلي)

### المرحلة 4: تحسين LoginForm — ثبات بصري (اختياري)
**الملف:** `src/components/auth/LoginForm.tsx`

**التغيير:**
- حجز مساحة ثابتة لرسائل الخطأ (`min-h` ثابتة) لمنع Layout Shift
- هذا تحسين بصري وليس إصلاح أمني

---

## ما لن يتم تغييره (ولماذا):
- **`useAdminDashboardData.ts`**: بعد القراءة، جميع الحسابات داخل `useMemo` وهي O(n) بسيطة على مصفوفات صغيرة (عقارات/عقود). النقل للخلفية تحسين مستقبلي وليس إصلاحاً عاجلاً
- **`SecurityGuard.tsx`**: لن يُعدّل (تعليمات المشروع تمنع ذلك بدون طلب صريح)
- **Route Loaders**: التحويل لـ react-router loaders تغيير معماري ضخم يتطلب إعادة كتابة نظام التوجيه بالكامل — غير مناسب الآن

## الملفات المتأثرة:
1. `src/contexts/AuthContext.tsx` — تعديل
2. `src/components/auth/ProtectedRoute.tsx` — تعديل
3. `src/components/guards/RequirePermission.tsx` — تعديل
