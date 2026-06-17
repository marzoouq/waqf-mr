# R8 — إصلاحات الاختبارات + A11y + RTL + Disclosure guards

## استكشاف سريع (نتائج فعلية)

- **الاختبارات الفاشلة الحقيقية:** 1 فقط — `src/app/bootstrap/bootstrap.smoke.test.ts` (وليس 3 كما زعم W8-#1). لا توجد ملفات اختبار لـ `useSupportAnalytics` ولا `usePropertyChecklist` أصلاً.
- **`<main>` landmark + lazy routes:** مُطبَّقة بالفعل (مُوثَّق في R7-EXECUTED).
- **DisclosurePage/MySharePage published guard:** غير موجود — لا فحص على `annual_report_status.status='published'`.
- **RTL utilities:** ~50 ملف يستخدم `ml-*/mr-*/pl-*/pr-*` بدل `ms-*/me-*/ps-*/pe-*`.

## ما سيُنفَّذ

### 1) إصلاح اختبار bootstrap الفاشل (W8-#1)
- قراءة `src/app/bootstrap/bootstrap.smoke.test.ts` لتحديد سبب الفشل (`schema] dashboard-summary validation failed`).
- إصلاح التوقع أو الـ mock بحسب السبب الفعلي.

### 2) Disclosure / MyShare published guard (W4-F06/F07)
- إنشاء hook `useIsAnnualReportPublished(fiscalYearId)` في `src/hooks/data/annualReport/` يستعلم `annual_report_status` ويُرجع `{ isPublished, isLoading }`.
- في `DisclosurePage.tsx` و `MySharePage.tsx`: إذا `!isPublished` → عرض بطاقة "التقرير قيد المراجعة — لم يُنشر بعد" بدل الأرقام المالية.

### 3) RTL utilities — جولة آمنة (W8-#4)
- script واحد يستبدل `mr-` → `ms-`, `ml-` → `me-`, `pr-` → `ps-`, `pl-` → `pe-` فقط في `src/components/` و `src/pages/` و **فقط** عند المتغيرات الرقمية القياسية (`ml-1` .. `ml-12`).
- استثناء: `min-l-`, `max-r-`, إلخ (نادرة، لكن regex يأخذها بعين الاعتبار: `\b(m|p)(l|r)-(\d+|auto)\b`).
- مراجعة diff قبل الاعتماد.

### 4) A11y review سريع
- تشغيل skill/accessibility على المكونات الأكثر استخداماً (Dialogs, Buttons icon-only, Inputs بدون label).
- إصلاح أبرز 5-10 مواضع `aria-label` ناقصة.

### 5) تقرير `R8-EXECUTED.md`

## ما لن يُنفَّذ
- إنشاء اختبارات جديدة لـ `useSupportAnalytics`/`usePropertyChecklist` (غير موجودة، لم يطلبها أحد).
- W2-F13 WebAuthn HttpOnly (architectural debt — وُثِّق في R7).
- W6-F17 GRANTs على 42 جدول → R9.

## ترتيب التنفيذ بعد الموافقة
1. قراءة `bootstrap.smoke.test.ts` + إصلاح.
2. hook `useIsAnnualReportPublished` + guards في الصفحتين.
3. RTL sed على `src/components/` و `src/pages/`.
4. A11y fixes (aria-label icon-only buttons).
5. تشغيل `bunx vitest run` للتأكد من 0 فشل.
6. تقرير.

**الزمن المتوقع:** جلسة واحدة قصيرة (تغييرات معظمها ميكانيكية).

موافق على البدء؟
