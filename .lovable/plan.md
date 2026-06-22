## نتائج الفحص المباشر لمركز التشخيص (/dashboard/diagnostics)

شُغّلت الصفحة فعلياً في المتصفح، وفُحص هوك `useSystemDiagnostics` ومحرك `checks.ts` و18 بطاقة فحص + Backend log + شاشات التبويبات السبعة، ورُوجعت قيود قاعدة البيانات. الصفحة تعمل ودرجة الصحة 88/100، لكن وُجدت أخطاء حقيقية وتحسينات مطلوبة.

---

### A) أخطاء حقيقية (Bugs) — يجب إصلاحها

1. **خطأ INSERT صامت في كل تشغيل للتشخيص (حرج)**
   `useSystemDiagnostics.run()` يُسجّل `logAccessEvent({ event_type: 'diagnostics_run' })`، لكن قيد `access_log_event_type_check` يقبل فقط: `login_success | login_failed | logout | idle_logout | unauthorized_access | signup_attempt | role_fetch | client_error`. النتيجة: استجابة 400 + تحذير في الكونسول عند كل تشغيل (شاهدناها مباشرة).
   **الإصلاح:** ترحيل DB يُوسّع الـ CHECK ليشمل `'diagnostics_run'` (مع `pass_diagnostics_run` كأمان متعدد القيم لاحقاً)، بدون لمس البيانات.

2. **فحص health-check يفشل دائماً في بيئة المعاينة (تشخيص خاطئ)**
   `checkBackendEdgeHealthPing` يُرجع `fail: ms=1018 network_error=TypeError: Failed to fetch` بسبب CORS preflight على `localhost`/lovableproject. هذه ليست عطلاً في Edge Function — بل بيئة معاينة.
   **الإصلاح:** عند `env === 'dev'` ووجود `TypeError: Failed to fetch` → الحالة `warn` بدلاً من `fail`، مع تفصيل واضح: «محظور CORS في المعاينة — سليم في الإنتاج».

3. **`runByIds` يُشغّل كل فحوصات البطاقة ثم يُرشّح (هدر شبكة وقاعدة بيانات)**
   زر «إعادة الفاشلة فقط» يُعيد تشغيل ~76 فحصاً ليُبقي 6 منها. مع فحوصات Supabase تعني عشرات طلبات DB لا لزوم لها.
   **الإصلاح:** ربط كل دالة فحص بـ `id` ضمن `diagnosticCategories` لاستهداف الدوال المعنية فقط.

4. **`EXPECTED_EDGE_FUNCTIONS` متخلف عن الواقع**
   القائمة بها 19 دالة بينما المنشور 24. «جرد Edge Functions» يعرض رقماً مضللاً.
   **الإصلاح:** تحديث القائمة لتطابق `supabase/functions/*` (مع تعليق يربطها بمصدر الحقيقة).

5. **`WebVitalsPanel` مُرَكَّب في تبويبين**
   نظرة عامة + الأداء الحي يستخدمانه معاً → اشتراكات PerformanceObserver مزدوجة وعمل زائد.
   **الإصلاح:** إبقاؤه في تبويب «الأداء الحي» فقط، واستبداله بكرت ملخّص (آخر التحديث) في «نظرة عامة».

---

### B) ملاحظات/تحسينات (UX & Performance)

6. **autoRun ينفذ كل الفحوصات (76) فور دخول الصفحة** — حتى لمستخدم يتصفح فقط. اقتراح: autoRun يُشغّل بطاقات «خفيفة» فقط (Storage/UI/Routing)، والباقي يدوي بزر «تشغيل الكل».
7. **`progress` يُحدّث setState مرتين لكل فحص** (قبل/بعد) → re-renders زائدة. الاكتفاء بتحديث بعد الانتهاء.
8. **`runAllDiagnostics` متسلسل تماماً** بين البطاقات للسماح بـ yield؛ يمكن تشغيل فحوصات بطاقة واحدة بـ `Promise.all` (كما يفعل `runCategoryDiagnostics`) دون التأثير على INP.
9. **`clearAll` لا يستخدم `Promise` للمراحل** (event + storage)؛ ضوضاء بسيطة عند إعادة التحميل المباشرة.
10. **«اتفاقيات الكود → الخطوط: Tajawal محمَّل — Amiri يُحمَّل عند الطباعة فقط (1 عائلة)»** — العدّ بعد lazy load غير دقيق؛ تحسين النص أو الانتظار حتى التحميل.
11. **«تطبيق المسارات: 39 رابط»** — لا يفصّل المسارات المسجَّلة بدون عنوان (route titles)؛ تفصيل أعمق سيوضّح فجوات `app-map`.
12. **`InteractionsTable`** يعرض tabs ثابتة من inventory مكتوب يدوياً — قد يتقادم؛ ربطه بـ glob على `src/pages` يحفظه محدّثاً.

---

### C) التنفيذ المقترح (Build Mode)

| # | الملف | التغيير |
|---|------|---------|
| 1 | `supabase/migrations/<ts>_extend_access_log_event_types.sql` | DROP/ADD CHECK يشمل `'diagnostics_run'` |
| 2 | `src/lib/diagnostics/checks/backend.ts` | معاملة `TypeError: Failed to fetch` في dev كـ `warn` + تفصيل |
| 3 | `src/lib/diagnostics/checks/backend.ts` | تحديث `EXPECTED_EDGE_FUNCTIONS` لـ 24 |
| 4 | `src/lib/diagnostics/checks.ts` | إضافة `idsByCategory` ثابت، وإعادة كتابة `runByIds` لاستدعاء الدوال المعنية فقط |
| 5 | `src/pages/dashboard/SystemDiagnosticsPage.tsx` | حذف `<WebVitalsPanel/>` من تبويب «نظرة عامة» |
| 6 | (اختياري) `useSystemDiagnostics.ts` | تحديث `setProgress` مرة واحدة لكل فحص |

كل التغييرات في src غير سلوكية على البيانات؛ الترحيل يُوسّع قيداً ولا يحذف صفوفاً.

---

### تقنية (للمراجع)
- التحقق من الكونسول الحي:
  ```
  [warning] logAccessEvent failed: new row for relation "access_log"
   violates check constraint "access_log_event_type_check"
  ```
- قيد القاعدة الحالي (تم استعلامه مباشرة):
  ```
  CHECK (event_type = ANY (ARRAY['login_success','login_failed','logout',
   'idle_logout','unauthorized_access','signup_attempt','role_fetch','client_error']))
  ```
- البيئة المعاينة تستخدم `localhost:8080` → CORS preflight يفشل على Edge Functions، وهي حالة معروفة لا تستوجب فشل التشخيص.

هل أبدأ التنفيذ بالإصلاحات A1–A5 ثم تحسينات B6–B7 (أو حدّد نطاقاً مختلفاً)؟