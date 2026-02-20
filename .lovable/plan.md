
# خطة تدقيق وتحسين الأداء والأمان

## المشاكل المكتشفة

### 1. مراجع Supabase خاطئة في index.html (خطير)
الملف `index.html` يحتوي على روابط لمشروع Supabase قديم (`epopjqrwsztgxigmgurj`) بدلا من المشروع الحالي (`nuzdeamtujezrsxbvpfi`). يشمل ذلك:
- `dns-prefetch` و `preconnect` (سطر 36-37)
- صور OG للمشاركة الاجتماعية (سطر 42, 45)

هذا قد يسبب عرض بيانات قديمة وصور مشاركة معطلة.

### 2. وسم apple-mobile-web-app-capable مهمل
المتصفحات الحديثة تعرض تحذير لأن `apple-mobile-web-app-capable` تم استبداله بـ `mobile-web-app-capable`.

### 3. تسرب ذاكرة في UpdatePrompt
استخدام `setInterval` بدون تنظيف (cleanup) عند إلغاء تسجيل المكون. يجب إرجاع دالة تنظيف من `onRegisteredSW`.

### 4. تسرب ذاكرة في BeneficiaryDashboard
الساعة المباشرة (`setInterval` للوقت) تعمل باستمرار حتى لو الصفحة في الخلفية.

### 5. عدم وجود آلية لتنظيف الكاش القديم
Service Worker لا يحتوي على `cleanupOutdatedCaches: true` مما يسبب تراكم كاش قديم.

### 6. CSP تشير للمشروع القديم
سياسة Content-Security-Policy في index.html تسمح فقط بالاتصال بـ `*.supabase.co` (عام) وهذا مقبول، لكن الروابط المباشرة خاطئة.

---

## خطة الإصلاح

### المرحلة 1: إصلاح المراجع الخاطئة في index.html
- تحديث `dns-prefetch` و `preconnect` للمشروع الصحيح `nuzdeamtujezrsxbvpfi.supabase.co`
- تحديث روابط صور OG للمشروع الصحيح
- استبدال `apple-mobile-web-app-capable` بـ `mobile-web-app-capable`

### المرحلة 2: تحسين إدارة الكاش في PWA
- إضافة `cleanupOutdatedCaches: true` في إعدادات Workbox بـ `vite.config.ts`
- إضافة `skipWaiting: true` لفرض تفعيل Service Worker الجديد فوراً
- إضافة `clientsClaim: true` للسيطرة على العملاء فوراً

### المرحلة 3: إصلاح تسربات الذاكرة
- **UpdatePrompt.tsx**: تخزين مرجع `setInterval` في متغير وتنظيفه (لا يمكن تنظيفه مباشرة من `onRegisteredSW` لكن يمكن استخدام `useEffect` مع ref)
- **BeneficiaryDashboard.tsx**: استخدام `requestAnimationFrame` أو `document.visibilitychange` لإيقاف الساعة عندما تكون الصفحة غير مرئية

### المرحلة 4: تحسينات الأداء
- لا توجد مشاكل أداء كبيرة حالياً (الأداء جيد):
  - FCP: 1.1 ثانية (جيد في بيئة المعاينة)
  - CLS: 0.0002 (ممتاز)
  - DOM: 263 عنصر فقط (خفيف)
  - الذاكرة: 12MB (منخفضة)
- تحسين بسيط: إضافة `loading="lazy"` للصور غير المرئية فوراً

---

## التفاصيل التقنية

### الملفات المتأثرة:
1. **index.html** - إصلاح المراجع + تحديث meta tag
2. **vite.config.ts** - تحسين إعدادات Workbox
3. **src/components/UpdatePrompt.tsx** - إصلاح تسرب الذاكرة
4. **src/pages/beneficiary/BeneficiaryDashboard.tsx** - تحسين الساعة المباشرة

### تغييرات vite.config.ts:
```typescript
workbox: {
  cleanupOutdatedCaches: true,  // حذف الكاش القديم تلقائياً
  skipWaiting: true,            // تفعيل SW الجديد فوراً
  clientsClaim: true,           // السيطرة على العملاء
  navigateFallbackDenylist: [/^\/~oauth/],
  // ... باقي الإعدادات
}
```

### تغييرات index.html:
```html
<!-- قبل (خاطئ) -->
<link rel="dns-prefetch" href="https://epopjqrwsztgxigmgurj.supabase.co" />
<!-- بعد (صحيح) -->
<link rel="dns-prefetch" href="https://nuzdeamtujezrsxbvpfi.supabase.co" />

<!-- تحديث الوسم المهمل -->
<meta name="mobile-web-app-capable" content="yes" />
```

### ملخص النتائج:
- 1 مشكلة خطيرة (مراجع Supabase خاطئة)
- 2 تسرب ذاكرة (UpdatePrompt + BeneficiaryDashboard)
- 1 تحذير (وسم مهمل)
- 1 تحسين كاش (cleanupOutdatedCaches)
- الأداء العام: جيد، لا توجد مشاكل أداء كبيرة
