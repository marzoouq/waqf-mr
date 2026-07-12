## نتائج التحقق من التقرير

بعد مطابقة التقرير مع الكود الفعلي:

| المشكلة | الحالة الحقيقية | إجراء |
|---|---|---|
| `useExpensesMutations.ts` يتجاوز الحد | **false-positive** — الملف الآن 148 سطر (الحد 180). التقرير من نشرة سابقة | لا شيء |
| 100 خطأ عميل مسجّل | تم تنظيف DB (٣ سجلات فقط) — الرقم "100" يأتي من `runtimeCollector` sessionStorage (سقف ثابت) | إضافة زر مسح + تخفيض السقف |
| `dashboard-summary validation failed` × 8 | تواريخ 21-25 مايو، schema حالياً `passthrough` متسامح | لا شيء (تاريخي) |
| `WebAuthn register-options error` × 7 | كلها ≥مارس (رفض المستخدم/قيود المنصة) | لا شيء |
| `crypto.randomUUID is not a function` × 4 | **حي** — آخر ظهور 8 يوليو | إصلاح |
| `[QueryCache] خطأ في جلب البيانات` × 45 | **حي** — رسالة عامة بدون تفاصيل | إثراء |
| `[Perf] بطيئة جداً` بقيم 9M ms / 12M ms / 474K ms | **حي** — عيب قياس (tab suspension) | إصلاح |
| `[Perf] invoke:*` cold-start 5-13s | متوقع لـ Edge Functions | رفع العتبة + keep-warm اختياري |
| `create_disbursement_voucher failed` × 3 | مايو (قد يكون قديم) | فحص خفيف |

---

## الخطة

### 1) polyfill آمن لـ `crypto.randomUUID` (P0)

المصادر الحية للخطأ:
- `src/lib/errorReporter.ts` (سطر 69)
- `src/hooks/ui/useMultipleFilesUpload.ts` (سطر 65)
- `src/lib/realtime/bfcacheSafeChannel.ts` (سطر 32)
- `src/hooks/data/archive/useArchivedDocumentMutations.ts`
- `src/hooks/data/invoices/useInvoiceFileUtils.ts`
- `src/hooks/page/admin/financial/useCreateInvoiceForm.ts`
- `src/hooks/page/admin/financial/useInvoiceLineItems.ts`

**الإجراء:**
- إنشاء `src/lib/utils/safeUuid.ts` مع دالة `safeUuid()` تعطي `crypto.randomUUID()` إن توفّر، وإلا fallback عبر `crypto.getRandomValues` (RFC4122 v4)، وإلا `Math.random` كملاذ أخير.
- استبدال كل استدعاءات `crypto.randomUUID()` في الملفات أعلاه بـ `safeUuid()`.

### 2) حماية `queryMonitor` من قفزات tab-suspension (P0)

`src/lib/monitoring/queryMonitor.ts` يستخدم `performance.now()` وقد يسجّل قِيَماً وهمية بالملايين عندما يتم تعليق التبويب في الخلفية.

**الإجراء:**
- تتبّع آخر `document.visibilitychange` وقت البدء والإنهاء داخل `startPerfTimer`.
- إذا حدث `visibilitychange:hidden` بين start و end، أو `durationMs > 60000` (60s سقف واقعي)، **لا يُسجَّل الخطأ** ويُصنَّف كـ `discarded`.
- إبقاء تسجيل `warn` فقط عند 3s–5s، و`error` عند 5s–60s.

### 3) إثراء رسائل `QueryCache` (P1)

**الإجراء:**
- تحديد الـ handler المركزي (queryClient config) وإضافة `queryKey` + `error.message` + `error.status` إلى النص المسجَّل بدلاً من الرسالة العامة.

### 4) رفع عتبة الأداء لـ Edge Functions البطيئة عادةً (P2)

الرسائل `invoke:dashboard-summary` 5-13s تتراكم كضجيج لأن cold-start طبيعي.

**الإجراء:**
- في `queryMonitor.ts` رفع `SLOW_QUERY_THRESHOLD_MS` للـ labels التي تبدأ بـ `invoke:` إلى `10000`، مع إبقاء 5s للـ `rpc:` و `Query:` (تلامس DB مباشرة).

### 5) لوحة التشخيص: مسح الجامع في-الجلسة (P1)

**الإجراء:**
- إضافة زر «مسح الأخطاء المحلية» في `RuntimeErrorsPanel.tsx` يستدعي `clearRuntimeErrors()` الموجودة أصلاً في `runtimeCollector.ts`.
- تخفيض `MAX_ENTRIES` من 100 → 50 لتقليل ضجيج الجلسات الطويلة.

### 6) فحص `create_disbursement_voucher` (P2)

قراءة تعريف الدالة والاستدعاءات لمعرفة إذا كان الخطأ ما زال ممكناً في الكود الحالي؛ إن كان قديماً/مصلَحاً — لا تغيير.

---

## ما لن يتم تغييره

- تصميم/UI (ملتزم بقيد المستخدم).
- سياسات RLS أو schema قاعدة البيانات.
- إعادة كتابة `useExpensesMutations.ts` (لا يتجاوز الحد).
- schema `dashboard-summary` (تاريخي ومتسامح).

## التحقق النهائي

- `tsgo` + Vitest.
- تشغيل جميع الفحوصات من `/dashboard/diagnostics` والتأكد من:
  - "حدود حجم الملفات" = pass.
  - "أخطاء التشغيل" = 0 بعد المسح.
  - لا `randomUUID` errors في console بعد الإصلاح.
