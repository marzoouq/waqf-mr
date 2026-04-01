

# إصلاح تأخر المعاينة وإزالة الوعد المعلّق

## المشكلات المكتشفة

### 1. الوعد المعلّق في `lazyWithRetry.ts` (سطر 33-38)
بعد استدعاء `window.location.reload()` يُنشأ وعد بـ timeout 8 ثوانٍ. هذا غير ضروري — إذا نجح الـ reload لن يصل الكود لهذه النقطة أصلاً، وإذا فشل فإن 8 ثوانٍ تأخير مفرط.

**الإصلاح:** حذف الوعد المعلّق بالكامل. بعد `window.location.reload()` نرمي الخطأ مباشرة ليُمسك من ErrorBoundary فوراً إذا لم يحدث reload.

### 2. رسائل التنبيه البطيئة من `performanceMonitor.ts`
- `reportPageLoadMetrics()` تعرض toast "تحميل الصفحة بطيء" عند تجاوز 5 ثوانٍ
- `startPerfTimer` تعرض toast "عملية بطيئة" لكل استعلام يتجاوز 5 ثوانٍ
- هذه التنبيهات **تظهر للمستخدم النهائي** وتُشوّش على تجربة الاستخدام

**الإصلاح:** إبقاء التسجيل في logger فقط (للتشخيص)، وإزالة toast التنبيه من المستخدم — هذه معلومات تقنية لا يحتاجها المستخدم العادي.

### 3. `runPwaCacheGuard()` يعمل بشكل متزامن قبل الـ render
في `main.tsx` سطر 28، يُستدعى `runPwaCacheGuard()` (دالة async) قبل `createRoot().render()` لكن **بدون await** — هذا لا يُسبب تأخيراً فعلياً، لكنه قد يُسبب سلوكاً غير متوقع. لا تغيير مطلوب هنا.

## التغييرات

### ملف 1: `src/lib/lazyWithRetry.ts`
- حذف الوعد المعلّق (أسطر 32-38)
- بعد `window.location.reload()` → `throw error` مباشرة

### ملف 2: `src/lib/performanceMonitor.ts`
- إزالة استدعاءات `_toastFn` من `startPerfTimer` (سطر 43-45) ومن `reportPageLoadMetrics` (سطر 86-88)
- إبقاء `logger.warn` للتشخيص

### ملف 3: `src/main.tsx`
- إزالة `setPerformanceToast` واستيراده (أسطر 8, 16) — لم يعد مطلوباً بعد إزالة toast الأداء

