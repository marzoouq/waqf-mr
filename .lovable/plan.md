

# خطة: إصلاح جميع المشاكل من تقرير ما قبل النشر

## الملفات المتأثرة: 7 ملفات

---

### 1. `.gitignore` — إضافة `.env`
- إضافة `.env` و `.env.local` و `.env.*.local` لمنع رفع المتغيرات

### 2. `public/robots.txt` — توحيد النطاق
- تغيير `https://waqf-mr.lovable.app/sitemap.xml` → `https://waqf-wise.net/sitemap.xml`

### 3. `public/sitemap.xml` — توحيد النطاق
- تغيير كل روابط `waqf-mr.lovable.app` → `waqf-wise.net`

### 4. `src/lib/queryClient.ts` — إضافة `gcTime`
- إضافة `gcTime: 30 * 60 * 1000` (30 دقيقة) للاحتفاظ بالبيانات المالية في الكاش

### 5. `src/main.tsx` — حماية `getElementById`
- إضافة تحقق من وجود عنصر `#root` قبل `createRoot` مع رسالة خطأ واضحة

### 6. `src/lib/logger.ts` — تسجيل أخطاء client_error
- في production: إرسال الأخطاء الحرجة عبر `logAccessEvent({ event_type: 'client_error' })` بدلاً من إسكاتها تماماً

### 7. `index.html` — تنظيف شامل
- إزالة meta tags المكررة (og:title, og:description, twitter:title, twitter:description في الأسفل)
- تغيير `og:image` و `twitter:image` لاستخدام `/og-image.png` من النطاق المحلي
- توحيد `theme-color` مع PWA manifest (`#1a365d`)

### 8. `src/App.tsx` — ErrorBoundary منفصل للمكونات الثانوية
- إحاطة `AiAssistant` و `PwaUpdateNotifier` و `SecurityGuard` بـ ErrorBoundary منفصل لمنع تعطل التطبيق بالكامل عند كسر مكون ثانوي

---

## ملاحظات تقنية

- **CSP `unsafe-inline`**: مطلوب لعمل Vite في dev mode ولأن المشروع يستخدم inline styles — لا يمكن إزالته بدون تغييرات هيكلية كبيرة. يبقى كما هو.
- **`supabase/client.ts`**: ملف مُولَّد تلقائياً ولا يجب تعديله — `detectSessionInUrl` و `flowType` لا يمكن إضافتهما هنا.
- **`manualChunks`**: موجود بالفعل في `vite.config.ts` (سطر 110+) — لا حاجة لإضافته.

