## التحقق من التقرير

فحصت كل بند مقابل الكود. النتائج:

| # | البند | الحالة |
|---|---|---|
| 1 | `0.0.0` fallback يعرض كل التحديثات | **مؤكد** — `PwaUpdateNotifier.tsx:92-95` |
| 2 | `pwa_last_seen_version` يُمسح عند الخروج | **مؤكد** — `storageKeys.ts:48-50` يستثني `BIOMETRIC_ENABLED` فقط |
| 3 | لا حد أقصى لعدد الإصدارات المعروضة | **مؤكد** — لا `slice` في `PwaUpdateNotifier.tsx:93-96` |
| 4 | `changelog.json` ملوّث برسائل تطوير | **مؤكد** — أمثلة فعلية: "Save plan in Lovable"، "Refactor accounts hooks"، "Update tests…" |
| 5 | `auto-version.yml` يُمرّر chore/refactor/perf/style | **مؤكد** — `auto-version.yml:84-87` يستبعد فقط `docs:` و `[skip ci]` |
| 6 | `setInterval` بدون cleanup | **منخفض** — موجود في `SwUpdateBanner.tsx` لكن `useRegisterSW` يدير عمر التسجيل؛ خارج النطاق |
| 7 | مسارا `pwa_just_updated` | **مقصود** — كلاهما يضع TTL=10د؛ ليس عطلاً |

سأنفّذ البنود 1-5، وأتجاهل 6-7 (الأول تحسين هامشي، الثاني سلوك مقصود).

---

## خطة الإصلاح

### 1. `src/components/pwa/PwaUpdateNotifier.tsx`
- **استبدال `0.0.0` fallback**: إن لم يوجد `lastSeen` (مستخدم جديد على الجهاز)، اعرض **أحدث إصدار فقط** (`[changelog[0]]`) واحفظه فوراً.
- **حد أقصى 3 إصدارات**: تطبيق `.slice(0, 3)` على نتيجة `filtered`.
- **ترتيب**: تأكيد أن `changelog[0]` هو الأحدث (مضمون من الـ workflow عبر `unshift`).
- حفظ `LAST_SEEN_KEY` قبل عرض النافذة لمنع إعادة العرض عند reload.

### 2. `src/constants/storageKeys.ts`
- إضافة `STORAGE_KEYS.PWA_LAST_VERSION` إلى `NON_CLEARABLE_KEYS`.
- تحديث التعليق التوضيحي ليفسر السبب (تجربة تحديث متّسقة عبر دورات تسجيل دخول/خروج، ليس سراً أمنياً).

### 3. `public/changelog.json`
- تنظيف الإدخالات الملوّثة الموجودة يدوياً: حذف الرسائل الإنجليزية الداخلية و التكرارات (`"Save plan in Lovable"`, `"Preceding changes"`, `"Update tests to match UI changes"`, `"Refactor accounts hooks"`, إلخ).
- دمج/استبدال بنصوص عربية مفيدة للمستخدم النهائي.
- إبقاء الإصدارات الحقيقية التي تحمل قيمة وظيفية فقط.

### 4. `.github/workflows/auto-version.yml`
تشديد فلتر الـ commits في `Collect commits since last tag`:
- استبعاد `chore:`, `refactor:`, `perf:`, `style:`, `test:`, `ci:`, `build:`, `docs:` بالكامل.
- استبعاد commits بالإنجليزية الخالصة (heuristic: لا تحتوي حروف عربية ولا تبدأ بـ `feat:`/`fix:`).
- استبعاد رسائل قصيرة جداً (<5 chars) ورسائل merge.
- إن لم يبقَ شيء بعد الفلترة، استخدم النص الافتراضي العربي الموجود `"تحسينات وإصلاحات متنوعة"`.

### 5. (إضافة) سياسة عرض المستخدم
- إذا كانت كل التغييرات من نوع `improvement` فقط، عرض النافذة لكن بدون toast صاخب — toast يُعرض فقط إذا فيه `feature` أو `fix`. (تخفيف الإزعاج بدون كسر سجل التحديثات).

---

## ما لن أمسّه

- `vite.config.ts` (إعدادات PWA صحيحة).
- `SwUpdateBanner.tsx` (`useRegisterSW` يدير دورة حياته).
- `pwaBootstrap.ts` (مساري `pwa_just_updated` مقصودان).
- `lazyWithRetry.ts` (حماية صحيحة).
- إعادة كتابة الـ workflow بالكامل — تعديل جراحي فقط على شرط الفلتر.

## نقاط التحقق

1. مستخدم جديد على جهاز نظيف → يرى نافذة بإصدار واحد فقط (الأحدث).
2. مستخدم سجل خروج/دخول → `pwa_last_seen_version` يبقى → لا تظهر نافذة بلا داعٍ.
3. تجاوز 3 إصدارات بين زيارتين → النافذة تعرض 3 فقط.
4. commit بـ `chore: refactor stuff` → لا يدخل changelog.
5. اختبارات `PwaUpdateNotifier` (إن وُجدت) لا تنكسر.
