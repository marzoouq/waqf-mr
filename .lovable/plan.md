## الهدف

معالجة الأخطاء التالية على الصفحة الرئيسية `/` وفحص تكرارها في كامل التطبيق:

- `[Violation] 'message' handler took ...ms`
- `[Violation] Forced reflow while executing JavaScript took ...ms`
- `Uncaught (in promise) Error: The provided callback is no longer runnable`

مع التحقق في بيئة مستقلة قبل اعتبار الإصلاح ناجحاً.

## التشخيص الحالي

الأدلة من الكود تشير إلى سببين مترابطين:

1. **استعلامات RPC غير قابلة للإلغاء**
   - `src/lib/api/rpc.ts` ينفّذ retry داخلياً مع `sleep` ولا يستقبل `AbortSignal` من TanStack Query.
   - إذا انتقل المستخدم أو أُعيد تركيب المكوّن بينما RPC ما زال يعمل، يمكن أن يكتمل الوعد بعد إلغاء الـ observer، فتظهر رسالة `The provided callback is no longer runnable`.

2. **مراقبة React Query ثقيلة جداً**
   - `src/lib/initQueryMonitoring.ts` يشترك في كل أحداث `QueryCache` ويبدأ/ينهي مؤقتات لكل fetch/success/error/removed.
   - مع موجات الاستعلامات عند تحميل الصفحة أو إعادة التركيب، هذا قد يطيل عمل React Scheduler ويظهر كـ `message handler took ...ms`.

3. **الصفحة الرئيسية تشغّل عدة استعلامات ثابتة عند الإقلاع**
   - `/` يستخدم `useLandingPage`، والذي يجمع إعدادات التطبيق، معلومات الوقف، الشعار، والإحصائيات العامة.
   - هذا يجعل الصفحة الرئيسية مكاناً مناسباً لظهور المشكلة حتى قبل دخول المستخدم.

## ما سيتم تنفيذه

### 1) جعل طبقة RPC قابلة للإلغاء

تعديل `src/lib/api/rpc.ts`:

- إضافة `signal?: AbortSignal` إلى `RpcOptions`.
- إيقاف الحلقة فوراً عند `signal.aborted`.
- تحويل `sleep` إلى نوم قابل للإلغاء.
- تمرير `signal` إلى عميل قاعدة البيانات عندما يدعمه الاستدعاء.
- عدم إعادة المحاولة إذا كان الخطأ إلغاءً مقصوداً.

النتيجة: عند إلغاء TanStack Query للاستعلام، يتوقف RPC ولا يحاول إكمال callback قديم.

### 2) تمرير `signal` في استعلامات RPC عبر التطبيق

تعديل كل `useQuery` الذي يستدعي `rpc()` مباشرة، وأهمها:

- `src/hooks/data/content/usePublicStats.ts`
- `src/hooks/data/dashboard/useBeneficiaryDashboardRpc.ts`
- `src/hooks/data/support/useSupportAnalytics.ts`
- `src/hooks/data/financial/dashboard/useTotalBeneficiaryPercentage.ts`
- `src/hooks/data/financial/advances/useMaxAdvanceAmount.ts`

النمط المطلوب:

```ts
queryFn: ({ signal }) => rpc('function_name', params, { signal })
```

أما RPC داخل mutations أو services اليدوية فلا تُعامل كاستعلام قابل للإلغاء إلا إذا كانت تُستدعى من queryFn.

### 3) تخفيف مراقبة QueryCache

تعديل `src/lib/initQueryMonitoring.ts`:

- إزالة المؤقت لكل حدث `fetch` لأن `rpc()` لديه مؤقت أداء مركزي بالفعل.
- جعل مراقبة QueryCache خفيفة: تسجيل الأخطاء فقط أو تعطيلها في الإنتاج إذا كانت تسبب عبئاً.
- منع تراكم المؤقتات عند إعادة التركيب أو فشل الاستعلامات.

النتيجة: تقليل ضغط main thread الذي يظهر كـ `message handler took ...ms`.

### 4) فحص كامل التطبيق لنفس النمط

فحص الملفات التالية وأنماطها:

- كل `useQuery` مع `rpc()` بدون `signal`.
- كل اشتراك Realtime/Auth للتأكد من وجود cleanup.
- كل `getBoundingClientRect` / `offsetWidth` / `scrollHeight` للتأكد من عدم وجود read/write layout loop.
- الصفحة الرئيسية، لوحة الناظر، لوحة المستفيد، الرسائل، الإشعارات، والتقارير المالية.

لن يتم تعديل ملفات المصادقة المحمية (`AuthContext.tsx`, `ProtectedRoute.tsx`, `SecurityGuard.tsx`) إلا إذا ظهر سبب مباشر وطلبت ذلك صراحة.

## اختبارات التحقق في بيئة مستقلة

### اختبار 1 — وحدة RPC

إنشاء/تحديث اختبار يثبت:

- إذا أُرسل `AbortSignal` وتم إلغاؤه، يتوقف `rpc()` فوراً.
- لا تحدث retries بعد الإلغاء.
- الأخطاء العادية ما زالت تُصنّف وتُعاد محاولتها حسب القواعد الحالية.

### اختبار 2 — الصفحة الرئيسية في متصفح مستقل

باستخدام Playwright على بيئة localhost مستقلة:

1. فتح `/` بصفحة جديدة.
2. التقاط console errors/warnings.
3. إعادة تحميل الصفحة سريعاً عدة مرات لمحاكاة unmount/remount.
4. الانتقال من `/` إلى `/auth` والعودة.
5. التأكد من عدم ظهور:
   - `The provided callback is no longer runnable`
   - `[App Error]` المرتبط بالاستعلامات

### اختبار 3 — فحص شامل للمسارات العامة والأساسية

تشغيل Playwright على:

- `/`
- `/auth`
- `/unauthorized`
- `/beneficiary` إذا توفرت جلسة اختبار محقونة
- `/dashboard` إذا توفرت جلسة اختبار محقونة

ومراقبة console + network + runtime errors.

### اختبار 4 — قياس الأداء بعد الإصلاح

- تشغيل Performance trace مختصر في Playwright/Chromium.
- التحقق أن long tasks لم تعد تصل إلى ثوانٍ متعددة على `/`.
- قبول تحذيرات DevTools الصغيرة فقط إذا كانت أقل من حدود خطورة عملية ولا تصاحبها أخطاء runtime.

## معايير النجاح

- اختفاء `The provided callback is no longer runnable` من `/` بعد reload/تنقل سريع.
- عدم ظهور `[App Error]` المرتبط بـ React Query على الصفحة الرئيسية.
- انخفاض `message handler` من ثوانٍ طويلة إلى قيم طبيعية.
- عدم كسر عرض إحصائيات الصفحة الرئيسية أو إعدادات الوقف.
- عدم كسر تسجيل دخول المستفيدين أو توجيههم.

## الملفات المتوقع تعديلها

- `src/lib/api/rpc.ts`
- `src/lib/initQueryMonitoring.ts`
- ملفات `useQuery` التي تستدعي `rpc()` مباشرة داخل `src/hooks/data/**`
- اختبار جديد أو محدث لـ `rpc()` / إلغاء الاستعلامات

## ما لن يتم تغييره

- لا تغييرات في قاعدة البيانات.
- لا تغييرات في Edge Functions.
- لا تعديل على `src/integrations/supabase/client.ts` أو `.env` أو `supabase/config.toml`.
- لا تعديل على ملفات المصادقة المحمية إلا بموافقة صريحة إذا أظهر الفحص ضرورة ذلك.
