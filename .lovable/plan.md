

# خطة التوثيق الشامل — المشاكل المتبقية والتحسينات المستقبلية

## الهدف

تحديث `.lovable/plan.md` و `docs/FINAL-AUDIT-REPORT.md` لتوثيق جميع المشاكل المكتشفة في الفحص الجنائي الأخير للبنية التحتية، مع تنفيذ الإصلاحات الممكنة مباشرة.

## الإصلاحات القابلة للتنفيذ الآن (8 إصلاحات)

| # | الملف | الإصلاح |
|---|-------|---------|
| 1 | `index.html` | إزالة `dns-prefetch` و `preconnect` بالرابط المكشوف |
| 2 | `index.html` | إضافة `worker-src 'self'` و `manifest-src 'self'` لـ CSP |
| 3 | `index.html` | إزالة `<meta name="keywords">` |
| 4 | `public/robots.txt` | منع فهرسة `/dashboard/` و `/beneficiary/` و `/unauthorized` |
| 5 | `vite.config.ts` | `skipWaiting: false` لحماية البيانات النشطة |
| 6 | `vite.config.ts` | توسيع `navigateFallbackDenylist` |
| 7 | `vite.config.ts` | `sourcemap: false` في production |
| 8 | `vite.config.ts` | إضافة `jspdf` و `recharts` لـ `manualChunks` |
| 9 | `vitest.config.ts` | إضافة `lcov` reporter |
| 10 | `package.json` | نقل `vite-plugin-pwa` لـ `devDependencies` + إضافة `^` لـ `next-themes` |

## التوثيق المستقبلي (لا يُنفَّذ الآن)

سيُضاف قسم جديد في `.lovable/plan.md` يوثق:

### أمان مستقبلي
- `strictNullChecks: true` — يتطلب إصلاح مئات الأخطاء تدريجياً
- CSP كـ HTTP header بدل `<meta>` (يحتاج إعداد خادم)
- `unsafe-inline` في `style-src` — يحتاج nonce-based CSP
- WebAuthn `auth-options` بدون JWT

### أداء مستقبلي
- ضغط `og-image.png` (903KB → ~80KB)
- تقليل كاش `StaleWhileRevalidate` من 30 يوم لـ 7 أيام

### CI/CD مستقبلي
- توحيد ملفات lock (npm vs bun)
- مزامنة إصدار `package-lock.json`
- فحص migrations قبل الدمج
- integration tests لـ Edge Functions
- coverage thresholds

### UX مستقبلي
- مقارنة سنة بسنة في KPI
- فلتر تحصيل العقود
- تصدير Excel
- تصنيف الإشعارات

### ZATCA مستقبلي
- FK على `invoice_chain.invoice_id`
- `seller_name`/`seller_vat` في جدول `invoices`
- Webhook callback من ZATCA

## الملفات المتأثرة

```text
index.html           ← إزالة URL + تحسين CSP + إزالة keywords
vite.config.ts       ← skipWaiting:false + sourcemap:false + chunks + denylist
vitest.config.ts     ← lcov reporter
public/robots.txt    ← منع فهرسة المسارات المحمية
package.json         ← نقل vite-plugin-pwa + ^ next-themes
.lovable/plan.md     ← توثيق شامل محدّث
docs/FINAL-AUDIT-REPORT.md ← إضافة قسم المشاكل المستقبلية
```

