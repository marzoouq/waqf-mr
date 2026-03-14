

# تقرير الفحص الجنائي — المشاكل المتبقية والتنفيذ الجزئي

## ملخص سريع

بعد فحص شامل للكود، تم التحقق من أن **الخطط السابقة المعتمدة تم تنفيذها بنجاح**:
- ✅ `lazyWithRetry` في `App.tsx` — مُنفذ بالكامل
- ✅ `StaleWhileRevalidate` في `vite.config.ts` — مُنفذ بالكامل  
- ✅ `ErrorBoundary` chunk error UI — مُنفذ بالكامل
- ✅ `PaymentInvoicesTab.tsx` تحميل PDF مباشر — مُنفذ بالكامل
- ✅ `login_success` يُسجَّل في `LoginForm.tsx` — **موجود فعلاً** (BUG-04 من التقرير كان خاطئاً؛ التسجيل يتم في LoginForm وليس AuthContext)

---

## المشاكل المتبقية الحقيقية (غير مُنفذة)

### 🔴 BUG-A — `window.open` في تقارير الطباعة (لا يزال قائماً)

**الملفات:**
- `src/utils/printShareReport.ts` سطر 37
- `src/utils/printDistributionReport.ts` سطر 37

كلاهما يستخدم `window.open('', '_blank')` للطباعة. هذا مختلف عن مشكلة PDF لأن الاستدعاء هنا **متزامن** (ليس بعد await)، لكن بعض المتصفحات تحجبه إذا كان ضمن سلسلة أحداث طويلة. بالإضافة إلى أن النافذة لا تُغلق بعد الطباعة.

**الإصلاح:** إضافة `printWindow.onafterprint = () => printWindow.close()` + التأكد من أن الاستدعاء مباشر من click event.

---

### 🟠 BUG-B — `useRealtimeAlerts.ts` مشكلتان

1. **`window.location.assign`** (سطر 45 و81) — يعيد تحميل الصفحة بالكامل ويفقد React Query cache. لكن بما أن Hook ليس داخل Router context (`useNavigate` لا يعمل في callback خارج component render)، الحل هو استخدام `window.location.href = '...'` مع `replace` أو قبول السلوك الحالي.

2. **لا يتعامل مع انقطاع الاتصال** (سطر 100) — `.subscribe()` بدون status callback. إذا انقطع الاتصال، `subscribedRef.current` يبقى `true` ولا يُعاد الاشتراك أبداً.

**الإصلاح:** إضافة status callback لـ `.subscribe()` لإعادة الاشتراك عند `CHANNEL_ERROR`.

---

### 🟡 BUG-C — `AiAssistant` و `SecurityGuard` و `PwaUpdateNotifier` لا تستخدم `lazyWithRetry`

في `App.tsx` سطر 90-92، هذه المكونات تستخدم `lazy()` العادي بدون `lazyWithRetry`. إذا فشل تحميل chunk لأحدها، لن يحصل تعافي تلقائي.

**الإصلاح:** استبدال `lazy()` بـ `lazyWithRetry()` لهذه المكونات الثلاثة.

---

## خطة التنفيذ — 4 تعديلات

### 1. `src/utils/printShareReport.ts`
- إضافة `printWindow.onafterprint = () => printWindow.close()` بعد `printWindow.print()`

### 2. `src/utils/printDistributionReport.ts`  
- نفس الإصلاح: إغلاق النافذة بعد الطباعة

### 3. `src/hooks/useRealtimeAlerts.ts`
- إضافة status callback لـ `.subscribe()` لمعالجة `CHANNEL_ERROR` و `TIMED_OUT`
- عند الخطأ: إعادة `subscribedRef.current = false` للسماح بإعادة الاشتراك

### 4. `src/App.tsx`
- تحويل سطور 90-92 من `lazy()` إلى `lazyWithRetry()`

