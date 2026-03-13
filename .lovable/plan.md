

# خطة إصلاح نتائج فحص الرابط والصفحات

## تقييم سريع للتقرير

| # | الادعاء | الحقيقة |
|---|---------|---------|
| 4 | og:title, og:description, og:image مفقودة | **خاطئ** — موجودة في أسطر 37-53 من index.html (أضافها النظام تلقائياً) |
| 10 | لا يوجد Route path="*" | **خاطئ** — موجود سطر 151: `<Route path="*" element={<NotFound />} />` |
| 11 | DeferredRender 3 ثوانٍ ثابتة | **خاطئ جزئياً** — يستخدم `requestIdleCallback` مع timeout كـ fallback (سطر 77-79) |

## الإصلاحات المطلوبة فعلاً

### 1. Footer: استبدال `<button>` بـ `<Link>` (أولوية متوسطة)
**الملف:** `src/pages/Index.tsx` أسطر 240-251
- استبدال 3 أزرار بـ `<Link to="...">` من react-router-dom
- يحل مشاكل: فتح في tab جديد، SEO crawling، Ctrl+Click

### 2. ArrowLeft → ArrowRight في CTA (أولوية منخفضة)
**الملف:** `src/pages/Index.tsx` سطر 232
- تغيير `ArrowLeft` إلى `ArrowRight` لتتوافق مع اتجاه RTL

### 3. sitemap.xml: إضافة الصفحات العامة المفقودة (أولوية متوسطة)
**الملف:** `public/sitemap.xml`
- إضافة `/privacy`, `/terms`, `/install`

### 4. og:image تستخدم رابط مؤقت (Google Storage مع Expires)
**الملاحظة:** صورة og:image الحالية مربوطة برابط Google Storage بتاريخ انتهاء. يُفضل استخدام `/og-image.png` المحلي الموجود فعلاً في `/public/og-image.png`.

### ما لن يُنفذ (مع السبب)

| المشكلة | السبب |
|---------|-------|
| `unsafe-inline` في CSP | Vite يحقن inline scripts — إزالته تكسر التطبيق. هذا قرار معماري معتمد |
| WebAuthn عبر النطاقات | سلوك متوقع في WebAuthn — البيانات مرتبطة بالنطاق حسب المعيار. لا إصلاح مطلوب |
| canonical/sitemap يشيران لـ waqf-wise.net | هذا صحيح — waqf-wise.net هو نطاق الإنتاج. الـ preview رابط تطوير فقط |
| روابط البريد SAMPLE_PROJECT_URL | هذا ثابت في قالب البريد كمرجع فقط، الروابط الفعلية تُولد ديناميكياً |

