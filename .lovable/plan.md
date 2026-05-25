# خطة إصلاح ملاحظات تدقيق waqf-wise.net

## 1. إصلاحات قسم البطل (LandingHero)

**الملف:** `src/components/landing/LandingHero.tsx`

- إخفاء سهم `ChevronDown` على الشاشات الصغيرة لمنع تداخله مع رقم "14 مستفيد":
  - تغيير `absolute bottom-8` → `hidden md:flex absolute bottom-8`
- تحسين تباين `hero_tagline`:
  - استبدال `text-secondary` بـ `text-secondary-foreground` أو `text-white/95` مع `font-semibold` لتحقيق WCAG AA
- تقليل `min-h-[90vh]` إلى `min-h-[100svh] md:min-h-[90vh]` لاستخدام `svh` (small viewport height) على الموبايل ومنع التمدد الزائد
- تقليل المسافة العلوية للإحصائيات على الموبايل: `mt-16` → `mt-10 md:mt-16`

## 2. إزالة ازدواجية CTA

**الملفات:** `src/components/landing/LandingHero.tsx` + `src/components/landing/LandingCTA.tsx`

- إبقاء زر "دخول النظام" في البطل كزر أساسي
- تغيير زر `LandingCTA` السفلي ليصبح ثانوي (variant مختلف) أو تغيير نصه إلى "ابدأ الآن" / "تصفّح الميزات" لتمييزه
- البديل: حذف زر CTA السفلي والاكتفاء بالعلوي مع تذييل بدون زر تكراري

## 3. إصلاحات SEO و Robots/Sitemap

**الملف:** `public/robots.txt`
- إضافة `Disallow: /auth` تحت كتلتي `Googlebot` و `Bingbot` لتوحيد السياسة مع `User-agent: *`
- إضافة `Disallow: /install` و `Disallow: /reset-password` لجميع الكتل

**الملف:** `public/sitemap.xml`
- حذف إدخال `/auth` (صفحة تسجيل دخول لا تُفهرس)
- حذف إدخال `/install` (صفحة PWA داخلية)
- إبقاء `/`, `/privacy`, `/terms` فقط

**الملف:** `index.html`
- تقصير `meta description` إلى ≤ 160 حرف مع الحفاظ على الكلمات المفتاحية الرئيسية (وقف، إدارة، عقارات، مستفيدين)
- التأكد من وجود `<link rel="canonical">` للنطاق الرسمي

## 4. تحسينات UX

**الملف:** `src/pages/Auth.tsx`
- إضافة رابط/زر عودة للرئيسية في أعلى الصفحة (`<Link to="/">` مع أيقونة `Home`)
- إصلاح محاذاة أيقونة تلميح البصمة مع النص العربي (إضافة `gap-2` ومراجعة `dir`)

**الملف:** `src/components/landing/LandingHero.tsx` (اختياري)
- إضافة شريط علوي خفيف (Header) للرئيسية بزر "دخول" مدمج لتجنب الحاجة للتمرير، مع `position: sticky` شفاف

## 5. تحسينات الأداء

**الملف:** `src/hooks/application/useLandingPage.ts` (أو المكان المسؤول عن `analytics`)
- تأجيل استدعاء `/~api/analytics` عبر `requestIdleCallback` أو `setTimeout(..., 2000)` لتقليل زمن TTI
- إضافة `loading="lazy"` لأي صور غير حرجة

**الملف:** `src/components/landing/LandingHero.tsx`
- تبسيط `<pattern id="islamicPattern">` (إزالة المسار الأصغر) لتقليل حجم DOM
- إضافة `will-change: auto` بدل أنماط الـ blur الثقيلة على الموبايل عبر `hidden md:block` للدوائر المتوهجة

## 6. إجراءات اختيارية موصى بها

- تشغيل `seo_chat--trigger_scan` بعد التطبيق للتحقق
- اختبار التباين عبر متصفح بعد تعديل `hero_tagline`
- مراجعة الشاشة على 360×800 و 414×896 بعد التطبيق

## التفاصيل التقنية

```text
LandingHero.tsx:
- L24:  min-h-[90vh]               → min-h-[100svh] md:min-h-[90vh]
- L62:  text-secondary             → text-white font-semibold (أو لون داكن جديد)
- L82:  mt-16                      → mt-10 md:mt-16
- L92:  absolute bottom-8 ...      → hidden md:flex absolute bottom-8 ...

robots.txt:
- إضافة Disallow: /auth, /install, /reset-password لكتلتي Googlebot و Bingbot

sitemap.xml:
- إزالة <url> الخاصة بـ /auth و /install
```

## الترتيب المقترح للتنفيذ

1. إصلاحات Hero الحرجة (تداخل + تباين)
2. SEO (robots + sitemap + meta)
3. إزالة ازدواجية CTA
4. UX (رابط العودة في Auth)
5. تحسينات الأداء (تأجيل analytics)
