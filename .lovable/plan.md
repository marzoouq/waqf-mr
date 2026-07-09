# خطة إصلاح المشاكل الجنائية — لوحة الناظر

الخطة مطابقة للتقرير الجنائي السابق ومقتصرة على المشاكل المؤكدة بالدليل البصري والشبكي.

## P0 — حرجة

### 1. الشعار المكسور في `WaqfInfoBar` و `PrintHeader`
- **الملف:** `src/components/layout/WaqfInfoBar.tsx` (سطر 53-59)
- **الإصلاح:** استنساخ نمط `SidebarBrand` — إضافة `useState` لـ `imgError` و `onError` على `<img>` مع fallback إلى أيقونة `Building2`.
- **الملف:** `src/components/common/layout/PrintHeader.tsx` (سطر 42)
- **الإصلاح:** نفس النمط — `onError` fallback إلى نص "وقف" الحالي.

### 2. تنظيف `waqf_logo_url` من قاعدة البيانات
- تنفيذ migration يفرغ القيمة إذا كانت تشير إلى `waqf-assets/logo.png` غير الموجود، ليتفعّل fallback المضاف في البند 1.

## P1 — عالية

### 3. تكرار `<h1>` — 3 عناصر في كل صفحة
- **الملف:** `src/components/layout/MobileHeader.tsx` (سطر 33) — تحويل `<h1>` إلى `<p role="heading" aria-level="1" aria-hidden="true">` (مخفي على desktop عبر `lg:hidden` أصلاً).
- **الملف:** `src/components/common/layout/PrintHeader.tsx` (سطر 48) — تحويل `<h1>` إلى `<h2>` (الطباعة سياق ثانوي).
- **النتيجة:** `<h1>` وحيد من `PageHeaderCard`.

### 4. أزرار أيقونية بلا `aria-label`
- **الملفات المتأثرة:**
  - `src/components/users/*` — أزرار تعديل/حذف/تفعيل لكل مستخدم (36 زر).
  - `src/components/dashboard/chart-of-accounts/*` — أزرار تعديل/حذف (17 زر).
- **الإصلاح:** إضافة `aria-label={\`تعديل ${row.name}\`}` و `aria-label={\`حذف ${row.name}\`}` ديناميكياً على كل زر.

## P2 — متوسطة

### 5. `HEAD /rest/v1/messages` مُلغى عند كل تنقل
- **البحث:** hook الرسائل غير المقروءة (على الأرجح في `src/hooks/data/messaging/`).
- **الإصلاح:** التأكد من أن TanStack Query يستخدم `staleTime` مناسب أو تعطيل refetch على تغيّر route؛ الإلغاء المتكرر يشير إلى polling بدون منطق `enabled` صحيح.

### 6. `/dashboard/audit-log` — نداء `HEAD` مزدوج
- **البحث:** hook الـ audit log — التحقق من `useEffect` مكرر أو استدعاءين متتاليين لـ `useQuery` بنفس المفتاح.

## التحقق النهائي

- تشغيل Playwright على 5 مسارات أساسية (dashboard/users/chart-of-accounts/audit-log/settings).
- التأكد من: (أ) اختفاء الأيقونة المكسورة بصرياً، (ب) `document.querySelectorAll('h1').length === 1`، (ج) عدم وجود أزرار بلا `aria-label`، (د) اختفاء `ERR_ABORTED` من سجل الشبكة.
- `bun run build` يجب أن ينجح بلا تحذيرات جديدة.

## تفاصيل تقنية

- لا تعديل على منطق الأعمال أو RLS أو Edge Functions.
- التغييرات presentational + hooks لتنظيف الطلبات + migration واحد بسيط لتفريغ إعداد.
- كل الإصلاحات محلية داخل الملفات المحددة أعلاه — لا لمس ملفات المصادقة أو الملفات المحمية.
