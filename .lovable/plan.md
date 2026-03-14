
# خطة التطوير — نظام وقف مرزوق بن علي الثبيتي

> **آخر تحديث:** 2026-03-14 | **الإصدار:** v2.9.0+

---

## ✅ مُنجز — إصلاحات البنية التحتية (2026-03-14)

- [x] إزالة Supabase URL المكشوف من `index.html`
- [x] تحسين CSP: إضافة `worker-src 'self'` و `manifest-src 'self'`
- [x] إزالة `<meta name="keywords">`
- [x] تحديث `robots.txt` لمنع فهرسة المسارات المحمية
- [x] `skipWaiting: false` في PWA لحماية البيانات النشطة
- [x] توسيع `navigateFallbackDenylist` في PWA
- [x] تعطيل sourcemaps في production
- [x] إضافة `jspdf`/`recharts` لـ `manualChunks`
- [x] إضافة `lcov` reporter لـ vitest coverage
- [x] إضافة `^` لـ `next-themes` في package.json

---

## 📋 مهام مؤجلة — أمان (تدريجي)

### 🔴 حرج — `strictNullChecks: true`
- **الملف:** `tsconfig.json` + `tsconfig.app.json`
- **المخاطر:** `null/undefined` يُعامَلان كأرقام صالحة → حسابات مالية بـ `NaN`
- **الخطة:** تفعيل تدريجي مع إصلاح الأخطاء الناتجة ملف بملف
- **التقدير:** 2-4 أيام عمل

### 🟠 عالي — `strict: true` + `noImplicitAny: true`
- **الملف:** `tsconfig.app.json`
- **الوضع الحالي:** `strict: false` بينما `tsconfig.node.json` = `strict: true`
- **الخطة:** تفعيل بعد `strictNullChecks`

### 🟡 متوسط — CSP كـ HTTP Header
- **المشكلة:** CSP عبر `<meta>` لا تدعم `frame-ancestors` ولا `report-to`
- **الحل:** إضافة `Content-Security-Policy` كـ HTTP Response Header عبر Edge Function أو Cloudflare Worker
- **المتطلب:** إعداد خادم وسيط

### 🟡 متوسط — إزالة `unsafe-inline` من `style-src`
- **المشكلة:** CSS Injection ممكن نظرياً
- **المتطلب:** nonce-based CSP يحتاج تعديل في Vite build pipeline

---

## 📋 مهام مؤجلة — أداء

### 🟡 ضغط `og-image.png`
- **الحجم الحالي:** 903KB — المعيار: < 200KB
- **الحل:** ضغط بـ WebP أو أدوات ضغط صور

### 🟡 تقليل كاش PWA للأصول الثابتة
- **الوضع الحالي:** `StaleWhileRevalidate` = 30 يوم
- **الحل:** تقليل إلى 7 أيام أو `CacheFirst` للأصول ذات hash

### 🟡 نقل `vite-plugin-pwa` لـ `devDependencies`
- **الوضع:** هي أداة build فقط لكنها في `dependencies`
- **الحل:** نقل يدوي في `package.json`

---

## 📋 مهام مؤجلة — CI/CD

- [ ] توحيد ملفات lock: اختيار `npm` أو `bun` وحذف الآخر
- [ ] مزامنة إصدار `package-lock.json` مع `package.json`
- [ ] إضافة `coverage.thresholds` (حد أدنى 60%) بعد استقرار التغطية
- [ ] تفعيل `noUnusedLocals` و `noUnusedParameters` تدريجياً
- [ ] إضافة integration tests لـ Edge Functions
- [ ] إضافة فحص migrations قبل الدمج في CI

---

## 📋 مهام مؤجلة — ZATCA

- [ ] إضافة FK على `invoice_chain.invoice_id` → `invoices.id`
- [ ] نقل `seller_name`/`seller_vat` من hardcoded إلى `app_settings`
- [ ] إضافة Edge Function لاستقبال Webhook callback من ZATCA

---

## 📋 مهام مؤجلة — UX

- [ ] مقارنة سنة بسنة في KPI Dashboard
- [ ] فلتر تحصيل العقود حسب الفترة
- [ ] تصدير Excel بالإضافة لـ PDF
- [ ] تصنيف الإشعارات (مالية / نظام / عقود)
