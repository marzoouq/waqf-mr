## المرحلة 1 — تنظيف الكاش الصارم (أولاً وقبل أي تعديل آخر)

الهدف: إزالة كل آثار الـ Service Worker القديم، Workbox caches، lazy chunks المخزّنة، وأعلام sessionStorage المتراكمة من إصلاحات سابقة، حتى لا تختلط أخطاء قديمة مع أي تشخيص جديد.

### 1.1 إيقاف التسجيل التلقائي للـ Service Worker
- `vite.config.ts`: تغيير `injectRegister: 'auto'` إلى `injectRegister: null` (التسجيل الوحيد سيكون عبر `SwUpdateBanner` مع حارس).
- إبقاء `navigateFallback: null` و `devOptions.enabled: false` كما هي.

### 1.2 حارس صارم لتسجيل SW
- في `src/components/pwa/SwUpdateBanner.tsx`: تغليف `useRegisterSW` بحارس مكوّن فرعي لا يُركّب إلا إذا:
  - `import.meta.env.PROD === true`
  - ليس داخل iframe (`window.self === window.top`)
  - hostname ليس `id-preview--*` ولا ينتهي بـ `.lovableproject.com` / `.lovable.dev` / `localhost`
  - الـURL لا يحتوي `?sw=off`
- في الحالات المرفوضة: استدعاء `getRegistrations()` و `unregister()` لأي `/sw.js` سابق متسرّب.

### 1.3 تنظيف Workbox caches بدقة (ليس بالجملة)
- `src/lib/pwaBootstrap.ts`: استبدال `caches.delete(name)` لكل الأسماء بـ filter يحذف فقط الكاشات الخاصة بالتطبيق:
  - `workbox-precache-*`
  - `html-navigations`
  - `static-assets`
  - `lazy-vendor-chunks`
  - `local-fonts`
  - `images`
- ترك أي كاش غير معروف (مستقبلاً push/firebase) بدون مساس.
- إزالة `unregister()` الشامل واستبداله بإلغاء تسجيلات `/sw.js` فقط.

### 1.4 تنظيف sessionStorage/localStorage القديم
- مفاتيح من إصلاحات سابقة لم تعد ضرورية:
  - `chunk_retry` (من `lazyWithRetry`)
  - `pwa_snoozed_version`
  - `pwa_just_updated`
- إضافة منظِّف واحد يعمل عند الإقلاع في preview/dev فقط، يمسح هذه المفاتيح حصراً.

### 1.5 كسر الـ retry loop لـ lazy chunks
- `src/lib/lazyWithRetry.ts`: إضافة TTL لمفتاح `chunk_retry` (10 ثوانٍ مثلاً) بدل العلامة الدائمة، حتى لا يُعطّل التعافي بعد reload واحد.
- توسيع كشف الأخطاء ليشمل: `Importing a module script failed`, `Unable to preload CSS`.
- تسجيل عبر `logger` عند بدء التعافي وعند الفشل النهائي.

### 1.6 توثيق إجراء "تنظيف صارم من جهة المستخدم"
- إضافة ملاحظة قصيرة في `docs/pwa-update-qa.md` بكيفية فرض التنظيف يدوياً (`?sw=off` + Hard Reload) لاستخدامها في QA.

## المرحلة 2 — إعادة التدقيق بعد التنظيف

بعد تطبيق المرحلة 1، نُعيد رصد الأخطاء من صفر:

### 2.1 تشخيص مركزي محسّن
- `src/lib/queryClient.ts`: إثراء `QueryCache.onError` بطباعة `meta` (table/queryKey/label/page) حتى لا يظهر فشل `useList` كـ stack مصغّر مجهول.
- `src/lib/lazyWithRetry.ts`: تسجيل اسم الـimport عند الفشل (يُمرَّر اختيارياً) لربط أي `lu/_init/_payload` المستقبلي بمسار حقيقي.

### 2.2 إعادة فحص حقول النماذج
- بعد التنظيف، رصد أي تحذيرات `name`/`id` متبقّية. حقول `/auth` الحالية مكتملة، لذا أي تحذير جديد سيُربط بنموذج آخر فعلي (وليس بكاش قديم).

### 2.3 التحقق الآلي
- `tsc --noEmit`
- `eslint .`
- `vitest run` مع تحديث:
  - `src/lib/pwaBootstrap.test.ts` ليعكس المسح الانتقائي.
  - `src/lib/lazyWithRetry.test.ts` لاختبار TTL والرسائل الجديدة.
  - اختبار خفيف لـ `SwUpdateBanner` يثبت عدم تسجيل SW في preview/iframe.

### 2.4 تحقق يدوي في المتصفح
1. فتح `?sw=off` مرة واحدة على النسخة المنشورة لتنظيف الجلسة.
2. Hard Reload.
3. فحص Console و Application → Service Workers و Cache Storage:
   - لا SW مسجّل في preview/iframe.
   - في الإنتاج: SW واحد فقط، caches معروفة فقط.
   - غياب `non-precached-url`، غياب `lu/_init/_payload`، غياب تحذيرات `name` من `/auth`.

## الملفات المتوقع تعديلها

- `vite.config.ts`
- `src/lib/pwaBootstrap.ts` + اختبار
- `src/components/pwa/SwUpdateBanner.tsx` + اختبار
- `src/lib/lazyWithRetry.ts` + اختبار
- `src/lib/queryClient.ts`
- `docs/pwa-update-qa.md`

## ملفات لن تُمَس

- ملفات المصادقة المحمية (`AuthContext`, `ProtectedRoute`, `SecurityGuard`).
- `supabase/config.toml`, `src/integrations/supabase/client.ts`, `types.ts`, `.env`.
- أي ملف بأشكال نماذج المصادقة (تم التحقق سابقاً أنها مكتملة `id` و `name`).
- قاعدة البيانات وسياسات RLS وEdge Functions.