## المشكلة

ملاحظتان في DevTools:

### 1) تحذير `preload` للخطوط (مؤكد على `/`)
`index.html` يحتوي على:
```html
<link rel="preload" href="/fonts/Tajawal-Regular-arabic.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/fonts/Tajawal-Bold-arabic.woff2" as="font" type="font/woff2" crossorigin />
```
وفي `src/index.css` نفس الخطوط معرّفة عبر `@font-face` مع `unicode-range` محدودة للعربية و`font-display: swap`. Chromium يحمّل ملف الـpreload لكن طلب CSS اللاحق يُعتبر طلباً مختلفاً (بسبب اختلاف credentials/cache key الناتج عن غياب unicode-range على الـpreload) فلا يُستخدم خلال 3 ثواني من `load` → التحذير المتكرر. النتيجة: تحميل مزدوج فعلياً ولا فائدة من الـpreload.

### 2) "No label associated with a form field"
لا توجد عناصر `<form>`/`<input>` على الصفحة الرئيسية `/` — لا في `Index.tsx` ولا في مكونات `landing/*`. الإشكال إذن مصدره صفحة أخرى زرتها (غالباً `/auth` أو حوار داخلي). لا أستطيع تحديد الحقل المخالف من تقرير DevTools وحده.

## الحل

### A. إصلاح تحذير preload (تنفيذ فوري)

**ملف**: `index.html` (السطر 36-37)

إزالة وسمَي `<link rel="preload">` للخطوط. المسوّغات:
- جميع `@font-face` الموجودة تستعمل `font-display: swap` → لن يحدث FOIT.
- النصوص العربية على الواجهة الأمامية تظهر فوراً بخط النظام ثم تستبدَل بـTajawal بسرعة (FOUT طفيف جداً غير ملحوظ في معظم الشبكات).
- إزالة التحميل المضاعف توفّر ~30-50KB من نطاق التحميل الحرج وتلغي تحذير DevTools.

بديل لو رفض المستخدم الإزالة: إبقاء الـpreload وإضافة `media="all"` صريح + التأكد أن مسار الـURL متطابق 100% مع طلب CSS — لكن في معظم الحالات السلوك لا يتحسّن.

### B. إصلاح "No label" 

أحتاج توضيحاً قبل التنفيذ:
- ما الصفحة التي ظهر فيها التحذير بالضبط؟ (URL مثلاً `/auth`، أو فتح حوار "إضافة مستفيد"…)
- إن أمكن، نسخ HTML العنصر المخالف من DevTools → Issues → Affected resource.

بمجرد تحديد الموضع: ربط `<Label htmlFor>` بـ`id` على الـ`<Input>`، أو لفّ الإدخال داخل `<label>` (في حالات الراديو/الشيك بوكس).

## التحقق

1. `bun run build` ثم تحميل المعاينة، فتح DevTools → Console + Issues.
2. التأكد من اختفاء رسالتَي preload خلال 5 ثوانٍ من تحميل `/`.
3. تشغيل Playwright على `/` لالتقاط Performance trace والتأكد أن LCP لم يتراجع (هدف: ≤ +50ms).
4. بعد تحديد مكان حقل النموذج المخالف: التحقق بـaxe-core أو Lighthouse a11y أن المشكلة اختفت.

## القيود

- بدون تعديل: `client.ts`, `types.ts`, `.env`, `config.toml`, ملفات المصادقة.
- بدون لمس الـDB أو Edge Functions.
- التعديل محصور في `index.html` + ملف واحد لاحقاً للـlabel.
