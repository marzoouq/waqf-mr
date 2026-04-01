
# إصلاح تجربة التحميل والتنقل

## المشكلات والحلول

### 1. شاشة التحميل (splash) تظهر لفترة طويلة

**السبب:** الـ splash في `index.html` يُزال بعد 500ms (سطر 40 في main.tsx)، لكن مكوّن `<PageLoader />` يظهر أثناء تحميل الصفحات بالـ lazy loading. الأهم: `AuthContext` يبدأ بـ `loading=true` ولا يتحول لـ `false` حتى ينتهي `fetchRole` (حتى 3 ثوانٍ timeout). هذا يعني أن المستخدم يرى شاشة تحميل حتى يكتمل جلب الدور.

**الإصلاح:** لا تغيير على AuthContext (يحتاج وقته لجلب الدور). لكن نجعل `<PageLoader />` أخف بصرياً ونضيف رسالة "جاري التحميل..." بدلاً من spinner فقط.

### 2. رسائل تنبيه مزعجة

**السبب:** 
- `PwaUpdateNotifier` يعرض toast "تم تحديث التطبيق بنجاح ✨" عند كل تحديث PWA
- `SwUpdateBanner` يعرض شريط "يوجد تحديث جديد" بشكل متكرر (يفحص كل 60 ثانية)
- في بيئة Preview، التحديثات مستمرة مما يعني ظهور هذه الرسائل باستمرار

**الإصلاح:**
- في `SwUpdateBanner`: تجاهل التحديثات في بيئة Preview (lovable.app / lovableproject.com)
- في `PwaUpdateNotifier`: نفس المنطق — لا تعرض toast في Preview

### 3. تأخير التنقل بين الصفحات

**السبب:** كل الصفحات تُحمّل بـ lazy loading، مما يعني كل تنقل يحتاج تحميل chunk جديد. هذا طبيعي ومقبول، لكن `DeferredRender` يؤخر بعض المكونات 3 ثوانٍ. الـ `<Suspense fallback={<PageLoader />}>` يعرض spinner أثناء التحميل وهذا سلوك صحيح.

**الإصلاح:** لا تغيير على lazy loading (مطلوب للأداء). تقليل `DeferredRender` delay من 3000ms إلى 1000ms لتسريع ظهور المكونات الثانوية.

## التغييرات

### ملف 1: `src/components/SwUpdateBanner.tsx`
- إضافة شرط: لا تعرض الشريط في بيئة Preview

### ملف 2: `src/components/PwaUpdateNotifier.tsx`
- إضافة شرط: لا تعرض toast التحديث في بيئة Preview

### ملف 3: `src/components/DeferredRender.tsx`
- تقليل الـ delay الافتراضي من 3000ms إلى 1000ms
