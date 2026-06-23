## الفحص الجنائي — ما هو مُصلَح فعلاً وما هو متبقّي

### 1) تحذيرات Preload للخطوط (Tajawal-*-arabic.woff2)
**الحالة:** مُصلَحة في الكود بالفعل.
- `index.html` السطور 33-37: لا توجد وسوم `<link rel="preload">` للخطوط.
- المصدر الوحيد للخطوط هو `@font-face` في `src/index.css` (السطور 75-153) مع `font-display: swap` وملفات موجودة في `public/fonts/`.

**سبب استمرار ظهور التحذيرات على `https://waqf-wise.net`:** الموقع المنشور لا يزال يُقدّم الـ build القديم (`vendor-react-BpimhaYH.js`، `index-BJwUJnfw.js`) الذي يحتوي على وسوم preload. **الإصلاح يتطلّب إعادة النشر فقط** — لا تغيير كود مطلوب.

### 2) `[Violation] 'message' handler took 1000-15000ms` + Forced reflow
**التحليل الجنائي:**
- `vendor-react-BpimhaYH.js:33` = React scheduler postMessage → عبء عمل ثقيل داخل work loop واحد.
- `initQueryMonitoring.ts` الحالي خفيف (مجرد سجل أخطاء في DEV فقط) — ليس السبب الحالي. التقرير الفرعي اقتبس نسخة قديمة.
- مصادر مرشّحة باقية:
  - **`useAppSettings.ts:30`** — يستخدم `return { ...query, ...writes }`. سَكب كائن `UseQueryResult` يكسر تتبّع QueryObserver ويُسبّب re-renders زائدة + احتمال الخطأ `The provided callback is no longer runnable`.
  - **`rpc.ts:110-112`** — `JSON.stringify(data).length` في DEV على كل استجابة (قد تكون كبيرة).
  - **`useChartReady.ts:38`** — `getBoundingClientRect()` متزامن داخل `useLayoutEffect` يُسبّب forced reflow في كل mount لرسم بياني.
  - **`usePagePerformance.ts`** — يُسجّل في كل تنقّل (مقبول، لا تغيير).

### 3) "No label associated with a form field"
يعود غالباً لـ `LoginMethodSelector`: `<RadioGroup>` بدون `<Label>` مرتبط بـ `id` المجموعة (الـ `htmlFor` غير موجود لـ `login_method`). نُضيف `<Label>` خفي مرتبط أو `aria-label` على `RadioGroup`.

---

## خطة الإصلاح

### A. تحذيرات الخطوط (لا كود — إجراء واحد)
**إعادة نشر الموقع** عبر زر النشر لإصدار build جديد يطابق المصدر الحالي. سيختفي التحذير تلقائياً من `waqf-wise.net`.

### B. بطء main thread + الخطأ "callback no longer runnable"
1. **`src/hooks/data/settings/app/useAppSettings.ts`** — استبدال `return { ...query, ...writes }` بإرجاع صريح:
   ```ts
   return {
     data: query.data,
     isLoading: query.isLoading,
     isError: query.isError,
     error: query.error,
     refetch: query.refetch,
     ...writes,
   };
   ```
   هذا يمنع كسر تتبّع QueryObserver ويقلّل re-renders.

2. **`src/lib/api/rpc.ts:110-112`** — تخطّي `JSON.stringify` للحمولات الكبيرة:
   ```ts
   if (import.meta.env.DEV && data) {
     try {
       const s = JSON.stringify(data);
       if (s.length < 100_000) recordPayloadSize(`rpc:${fnName}:response`, s.length);
     } catch { /* noop */ }
   }
   ```

3. **`src/hooks/ui/useChartReady.ts`** — تأجيل القياس المتزامن إلى `requestAnimationFrame` لتجنّب forced reflow:
   - نقل `getBoundingClientRect()` إلى داخل `rAF` أول، وإبقاء `ResizeObserver` كما هو.

### C. تحذير "No label associated with a form field"
**`src/components/auth/login/LoginMethodSelector.tsx`** — إضافة `<Label htmlFor={...}>` للعنوان أو `aria-label` صريح على `RadioGroup`. سأتحقّق من جميع الحقول المماثلة في `LoginForm`/`PasswordField` ومعالجتها بنفس الطريقة إذا لزم.

### D. التحقّق
- `bun run build` ثم `bunx vitest run` (لا تغيير سلوكي).
- Playwright على `/` و `/auth`: التقاط console لمدة 10 ثوانٍ بعد load والتأكّد من غياب:
  - `'message' handler took >500ms`
  - `Forced reflow ... >50ms`
  - `callback is no longer runnable`
  - تحذيرات a11y على عناصر النموذج.
- إعادة النشر للتحقّق من اختفاء تحذيرات preload في الإنتاج.

### قيود
- لا تعديل على ملفات Auth/DB/Edge محمية.
- التغييرات محصورة في 4 ملفات: `useAppSettings.ts`, `rpc.ts`, `useChartReady.ts`, `LoginMethodSelector.tsx`.
