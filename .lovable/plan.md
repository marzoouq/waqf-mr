# خطة إصلاح آلية تحديث التطبيق (PWA)

## السلوك المطلوب (مرجع التحقق)

| السيناريو | السلوك الصحيح |
|---|---|
| لا يوجد تحديث فعلي على الإنتاج | لا شريط، لا toast، لا reload — التطبيق يفتح فوراً |
| نُشر تحديث فعلي (JS/CSS تغيّر) | يظهر **شريط يدوي واحد** للمستخدم "يوجد تحديث — تحديث الآن" |
| المستخدم ضغط "تحديث الآن" | يُفعَّل SW الجديد + reload مرة واحدة + (اختياري) عرض سجل التغييرات |
| المستخدم أجّل التحديث | لا يُعاد عرض البانر لنفس النسخة حتى دخول لاحق + مرور وقت معقول |
| إغلاق وفتح بدون تحديث جديد | **صفر شريط** — التطبيق يفتح كأي مرة |

## السبب الجذري الحالي (مؤكَّد بالكود)

ثلاث آليات متنافسة تعمل في كل cold launch:
1. `src/lib/pwaBootstrap.ts:42-65` — يقارن `VITE_APP_BUILD_ID` (= `pkg.version`) بقيمة مخزّنة، وعند الاختلاف يمسح كل الكاش ويُجبر `window.location.reload()`. وبما أن `auto-version.yml` يبمب `patch` مع **كل** push إلى `main`، فالنسخة تختلف دائماً → reload قسري دائم.
2. `src/components/pwa/SwUpdateBanner.tsx` — workbox يكتشف SW جديد (بسبب precache manifest جديد ناتج من بمب النسخة) → يعرض شريط "تحديث جديد".
3. `src/components/pwa/PwaUpdateNotifier.tsx` — يقرأ علم `pwa_just_updated` بعد كل reload ويعرض toast + ديالوج سجل تغييرات.

النتيجة: حتى بدون تغيير حقيقي في JS/CSS، مجرد بمب النسخة يفعّل الثلاثة معاً عند كل فتح.

## التطبيق الصحيح — مرجع مقارن

| النهج | ميزته | عيبه | الحكم |
|---|---|---|---|
| **A. workbox فقط (`registerType: 'prompt'`)** — مصدر حقيقة واحد | يتفعّل فقط عند تغيّر hash لأصل في precache (محتوى فعلي) | يحتاج المستخدم نقرة | ✅ **هذا المطلوب** |
| B. workbox `autoUpdate` + `skipWaiting` | بدون تفاعل | قد يُسقط الصفحة أثناء استخدام نشط | ❌ تجربة سيئة |
| C. مقارنة نسخة يدوية + reload قسري (الحالي) | تحكّم كامل | يتفعّل على بمب نسخة بدون تغيير محتوى | ❌ السبب الحالي للحلقة |
| D. polling لـ `/version.json` | يعمل عبر cross-tab | تكرار شبكي + يكرر سبب C | ❌ |

**المعتمد**: النهج A. workbox هو **المصدر الوحيد للحقيقة**، و`pkg.version` تبقى للعرض (سجل التغييرات + الإحصاء) فقط — **لا تُحرّك** آلية التحديث.

## نقاط التحقق على صلاحية الخطة

- [x] workbox `cleanupOutdatedCaches: true` مُفعّل بالفعل في `vite.config.ts` → آمن إزالة `pwaBootstrap` reload.
- [x] `SwUpdateBanner.handleUpdate` يضع `pwa_just_updated` بالفعل → `PwaUpdateNotifier` يستمر بالعمل بعد التحديث الحقيقي فقط.
- [x] workbox يولّد precache manifest بـ **content hash** للأصول، لا برقم النسخة. إخراج `index.html` من precache يجعل بمب النسخة وحده **غير كافٍ** لتوليد SW جديد — يحتاج تغيير محتوى فعلي.
- [x] `registerType: 'prompt'` + `skipWaiting: false` + `clientsClaim: false` (المضبوط حالياً) صحيح لمنهج "موافقة المستخدم".
- [x] حارس المعاينة/iframe في `pwaBootstrap` يبقى — مفيد لتنظيف SW المتسرب داخل sandbox Lovable.

## التغييرات (3 ملفات)

### 1) `src/lib/pwaBootstrap.ts` — حذف فرع reload القسري
- **الإبقاء**: فرع `isPreviewHost || isInIframe` (مسح SW + caches في sandbox).
- **الحذف**: كل فرع الإنتاج الذي يقارن `APP_BUILD_ID` ويمسح ويُعيد التحميل. مع شطب `CACHE_VERSION_KEY` و`pwa_reload_guard` و`pwa_just_updated` من هذا الملف (الأخير ينتقل ملكيته بالكامل إلى `SwUpdateBanner`).
- **الناتج**: ~30 سطر بدل 70.

### 2) `src/components/pwa/SwUpdateBanner.tsx` — كبح الضوضاء + ربط بسجل التغييرات الفعلي
- تأخير أول `registration.update()` إلى **30 ثانية** بعد الإقلاع.
- رفع فترة الفحص الدوري من **60ث إلى 5 دقائق**.
- إضافة تذكُّر بالنسخة: `pwa_snoozed_version` — عند الرفض، احفظ نسخة الـ SW الجديد. لا تُظهر البانر مجدداً لنفس النسخة قبل 24 ساعة.
- `handleUpdate` يضع `pwa_just_updated` (موجود) — هذا يبقى المُحفّز الوحيد لـ `PwaUpdateNotifier`.

### 3) `vite.config.ts` — إخراج `index.html` من precache + قاعدة navigate
- إزالة `html` من `globPatterns` (يبقى `js, css, ico, png, svg, woff2, ttf`).
- إزالة `navigateFallback: 'index.html'`.
- إضافة قاعدة في `runtimeCaching`:
  ```ts
  { urlPattern: ({ request }) => request.mode === 'navigate',
    handler: 'NetworkFirst',
    options: { cacheName: 'html', networkTimeoutSeconds: 3 } }
  ```
- **الأثر**: بمب النسخة فقط (بدون تغيير JS/CSS) لن يُولّد SW جديد بعد الآن، فلن يظهر بانر إلا عند تحديث فعلي.

## ما لن نعدّله (مقصود)
- `package.json` ونظام البمب التلقائي — يبقى يخدم سجل التغييرات والإحصاء.
- `PwaUpdateNotifier.tsx` — منطقه صحيح، يعتمد على علم سيتم وضعه فقط عند تحديث حقيقي بعد الإصلاح.
- ملفات المصادقة والـ RLS وأي مكوّن غير PWA.

## التحقق بعد التنفيذ (مصفوفة الفحص)

1. **`bunx vitest run`** — كل الاختبارات الـ1858+ تمر.
2. **محلياً (preview)**: فتح وإغلاق التطبيق مراراً — لا شريط ولا reload.
3. **إنتاج بعد دفع كوميت بلا تغيير محتوى** (تعليق فقط): فتح PWA → **لا** شريط.
4. **إنتاج بعد دفع كوميت يغيّر JS فعلياً**: فتح PWA → شريط واحد فقط بعد ≤5 دقائق من الاستخدام (أو بعد 30ث من cold launch) → نقرة → reload → toast سجل التغييرات.
5. **Android Chrome + iOS Safari PWA مثبّت**: السيناريو 3 و4 يدوياً.
6. **رفض التحديث**: إعادة فتح خلال 24 ساعة لنفس النسخة → لا بانر.

## انعكاس على بقية الشاشات
الإصلاح في طبقة Boot/SW فقط — **لا يلمس أي صفحة أو data hook أو دور**. كل الشاشات (admin/accountant/beneficiary/waqif) ستتحسّن تلقائياً لأن المشكلة كانت في الإقلاع لا في الصفحات.

## ما يبقى خارج هذا الـ MR (مقترحات لاحقة)
- security-gate يرفض `window.location.reload()` خارج `SwUpdateBanner`.
- توثيق `src/components/pwa/README.md`.
- اختبار E2E لمحاكاة بمب SW.
- التدقيق المعماري الكامل قُدّم في الجولة السابقة وكان نظيفاً — لا تغييرات مطلوبة الآن.

بانتظار موافقتك للانتقال إلى Build.