

# آلية التحديث الإجباري — "يوجد تحديث جديد"

## المشكلة
`skipWaiting: false` في إعدادات PWA يعني أن Service Worker الجديد ينتظر حتى يُغلق المستخدم **جميع** التبويبات. لا توجد آلية تُعلم المستخدم بوجود تحديث منتظر.

## الحل

### 1. تغيير `vite.config.ts`
- تغيير `registerType` من `'autoUpdate'` إلى `'prompt'` ليعطي التطبيق تحكماً كاملاً بتوقيت التحديث
- إبقاء `skipWaiting: false` (SW الجديد ينتظر حتى يضغط المستخدم "تحديث")

### 2. إنشاء مكون `SwUpdateBanner.tsx`
- يستخدم `useRegisterSW` من `virtual:pwa-register/react`
- عند اكتشاف `needRefresh = true`، يعرض شريط (banner) ثابت أعلى الشاشة:

```text
┌─────────────────────────────────────────────┐
│ 🔄 يوجد تحديث جديد   [تحديث الآن]  [لاحقاً] │
└─────────────────────────────────────────────┘
```

- زر "تحديث الآن" → `updateServiceWorker(true)` (يُفعّل skipWaiting + يعيد التحميل)
- زر "لاحقاً" → يخفي الشريط مؤقتاً (يعاود الظهور بعد 30 دقيقة)
- الشريط يظهر بـ `position: fixed; top: 0; z-index: 9999` فوق كل شيء

### 3. تعديل `App.tsx`
- إضافة `<SwUpdateBanner />` داخل المكون الجذري (خارج Router)

### 4. تحديث `PwaUpdateNotifier.tsx`
- إزالة التداخل: `PwaUpdateNotifier` يبقى لعرض سجل التغييرات **بعد** التحديث فقط
- `SwUpdateBanner` يتولى إشعار التحديث **قبل** التحديث

## الملفات المتأثرة
```text
vite.config.ts                    ← registerType → 'prompt'
src/components/SwUpdateBanner.tsx  ← مكون جديد
src/App.tsx                       ← إضافة SwUpdateBanner
```

