

# خطة الإصلاح الشاملة - المشاكل المتبقية

## الحالة الحالية (ما تم إصلاحه بالفعل)

| الملف | الحالة |
|---|---|
| `src/lib/logger.ts` | مُنفَّذ |
| `src/components/ErrorBoundary.tsx` | مُنفَّذ (يستخدم `logger` + يخفي الخطأ في Production) |
| `src/utils/pdf/core.ts` | مُنفَّذ (يستورد `logger`، catch صامت) |
| `src/main.tsx` | مُنفَّذ (لا يوجد `console.*` مكشوف) |
| `src/contexts/AuthContext.tsx` | مُنفَّذ (stale closure مُعالج بـ `roleRef`) |
| `src/components/ProtectedRoute.tsx` | مُنفَّذ (مبسّط) |
| `src/utils/safeErrorMessage.ts` | مُنفَّذ (يستخدم `logger.error`) |

---

## المطلوب تنفيذه (6 تغييرات)

### 1. تحديث اختبار `safeErrorMessage.test.ts` (متوسط)

**المشكلة:** الاختبار يراقب `console.error` لكن الكود يستخدم `logger.error` الآن. في بيئة الاختبار (DEV=true)، `logger.error` يستدعي `console.error` فعلياً، لذا الاختبار ينجح حالياً. لكن هذا هش ويعتمد على تفاصيل التنفيذ.

**الإصلاح:** تحديث الاختبار ليراقب `logger.error` مباشرة بدلاً من `console.error`.

### 2. تحديث اختبار `ErrorBoundary.test.tsx` (متوسط)

**المشكلة:** نفس المشكلة -- الاختبار يتحقق من `console.error` بينما `ErrorBoundary` يستخدم `logger.error`.

**الإصلاح:** تحديث `beforeEach` والاختبار الأخير للتحقق من `logger` بدلاً من `console.error` مباشرة.

### 3. إصلاح `useRawFinancialData.ts` -- `isError` ناقص (تحسين)

**المشكلة:** `isError` يتجاهل أخطاء `accounts` و `beneficiaries`:
```text
const isError = incError || expError;  // ينقصه accError و benError
```

**الإصلاح:** إضافة `isError` من `useAccounts` و `useBeneficiariesSafe` وتضمينها في الحساب.

### 4. إصلاح `issuesFixed` في `ReportsPage.tsx` (تحسين)

**المشكلة:** `issuesFixed = 0` قيمة ثابتة لا تعكس الواقع.

**الإصلاح:** حسابها ديناميكياً بناءً على عدد الفحوصات الناجحة مقارنة بالإجمالي، أو ربطها بمتغير يعكس الإصلاحات الفعلية.

### 5. تحديث `README.md` -- placeholder URLs (تحسين)

**المشكلة:** السطران 66-67 يحتويان على `<YOUR_GIT_URL>` و `<YOUR_PROJECT_NAME>`.

**الإصلاح:** استبدالهما بالقيم الفعلية:
```text
git clone https://github.com/marzoouq/waqf-mr.git
cd waqf-mr
```

### 6. تحسين logging في `ai-assistant` Edge Function (منخفض)

**المشكلة:** `console.error` في السطرين 98 و 108 قد تكشف تفاصيل API الداخلية في سجلات الخادم.

**الإصلاح:** تقليل المعلومات المسجلة لتشمل فقط `response.status` بدون محتوى الاستجابة الكامل `t`، وعدم تسريب `e.message` الكامل في الاستجابة للمستخدم.

---

## ملاحظات لن يتم التعديل عليها

| الملاحظة | السبب |
|---|---|
| `package.json` (name/version/devDeps) | ملف محمي لا يمكن تعديله |
| `supabase/functions/guard-signup` console.error | Edge Functions تعمل على الخادم وليس المتصفح -- مقبول |
| `src/test/setup.ts` console.warn | مخصص لبيئة الاختبار فقط -- مقبول |
| PWA 192x192 icon | تم إنشاؤه في تعديل سابق |

---

## التفاصيل التقنية

### الملفات المتأثرة

1. `src/utils/safeErrorMessage.test.ts` -- تحديث spy من `console.error` الى `logger`
2. `src/components/ErrorBoundary.test.tsx` -- تحديث spy من `console.error` الى `logger`
3. `src/hooks/useRawFinancialData.ts` -- إضافة `isError` من accounts و beneficiaries
4. `src/pages/dashboard/ReportsPage.tsx` -- حساب `issuesFixed` ديناميكياً
5. `README.md` -- تحديث placeholder URLs
6. `supabase/functions/ai-assistant/index.ts` -- تقليل المعلومات في console.error وتأمين رسالة الخطأ

