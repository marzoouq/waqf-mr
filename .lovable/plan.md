

## خطة إصلاح تحذير Lock في Supabase Auth

### المشكلة
تحذير `Lock not released within 5000ms` يظهر بسبب **React StrictMode** الذي يشغّل `useEffect` مرتين في بيئة التطوير، مما يُنشئ مستمعَين متنافسَين على `onAuthStateChange` ويسبب تصادم أقفال.

### هل هو خطير؟
**لا** — المكتبة تتعافى تلقائياً (`Forcefully acquiring the lock to recover`). لكن يمكن تقليل حدوثه.

### التغييرات المطلوبة

#### 1. إضافة `detectSessionInUrl` و `storageKey` لعميل Supabase
- الملف **لا يُعدّل يدوياً** (`src/integrations/supabase/client.ts` تلقائي)
- لكن يمكن تحسين `AuthContext` لتقليل التصادم

#### 2. تحسين AuthContext (الملف الرئيسي)
**`src/contexts/AuthContext.tsx`**:
- إزالة استدعاء `getSession()` المتوازي مع `onAuthStateChange` — هذا هو السبب الأساسي للتصادم
- الاعتماد على `onAuthStateChange` فقط مع `INITIAL_SESSION` event (متاح في الإصدارات الحديثة)
- إضافة حارس `isMounted` لمنع تحديث الحالة بعد unmount في StrictMode

#### 3. النتيجة المتوقعة
- اختفاء التحذير في أغلب الحالات
- لا تغيير في السلوك الوظيفي — تسجيل الدخول/الخروج يعمل كما هو
- أداء أفضل عند التحميل الأول (طلب واحد بدل اثنين)

### ملاحظة تقنية
الملف `src/integrations/supabase/client.ts` لا يُعدّل (تلقائي). العميل مُهيَّأ بالفعل خارج المكونات ✅. التحسين كله في `AuthContext`.

