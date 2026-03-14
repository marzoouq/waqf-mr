

## إصلاح خطأ الواجهة: فشل تحميل الصفحات (Stale Chunk Recovery)

### المشكلة الجذرية
عند نشر تحديث جديد، تتغير أسماء ملفات JavaScript المجزأة (chunks). لكن Service Worker يخدم النسخ القديمة من الكاش بسبب استراتيجية `CacheFirst` على `/assets/*.js|css`. عندما يحاول React تحميل صفحة عبر lazy loading، يفشل لأن الملف القديم غير موجود → تسقط الواجهة في ErrorBoundary.

### خطة الإصلاح — ملفان

**1. `vite.config.ts`** — تغيير استراتيجية كاش الأصول
- تحويل `/assets/*.js|css` من `CacheFirst` إلى `StaleWhileRevalidate`
- هذا يسمح بتقديم النسخة المخبأة فوراً مع تحديثها في الخلفية

**2. `src/App.tsx`** — إضافة تعافي تلقائي عند فشل تحميل chunk
- تغليف كل `lazy()` بدالة مساعدة `lazyWithRetry` تلتقط خطأ `Failed to fetch dynamically imported module`
- عند الخطأ: مسح كاشات الأصول + إعادة تحميل الصفحة مرة واحدة فقط (guard عبر sessionStorage لمنع loop)

```text
المستخدم يفتح صفحة
  → lazy() يطلب chunk
  → chunk قديم/غير موجود
  → lazyWithRetry يلتقط الخطأ
  → يمسح كاش 'static-assets'
  → يعيد تحميل الصفحة (مرة واحدة)
  → Service Worker يجلب الملفات الجديدة
  → الصفحة تعمل
```

### التفاصيل التقنية

**`lazyWithRetry` helper:**
- يلتقط أخطاء `Failed to fetch dynamically imported module` و `Loading chunk`
- يستخدم `sessionStorage('chunk_retry')` كحارس لمنع حلقة إعادة تحميل لا نهائية
- يمسح cache باسم `static-assets` فقط (لا يمس كاش الخطوط أو API)

**تغيير `CacheFirst` → `StaleWhileRevalidate`:**
- يحافظ على سرعة التحميل (يقدم من الكاش أولاً)
- يحدّث الكاش في الخلفية عند توفر نسخة جديدة
- يمنع تراكم الملفات القديمة

