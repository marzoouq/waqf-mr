# دليل استكشاف الأخطاء

## السيناريوهات الشائعة

### 1. Lighthouse يتجمّد ولا يكمل الفحص

**السبب الأرجح**: SW أو realtime أو polling يمنع `networkidle`.

**الحل**:
- أضف `?audit=1` إلى الرابط.
- تحقق من Overlay أسفل اليسار — كل البطاقات خضراء؟
- لو ما زال: استخدم Lighthouse Timespan بدل Navigation.

### 2. شاشة بيضاء بعد deploy

**السبب الأرجح**: SW قديم يخدّم HTML قديم يُشير إلى chunks محذوفة.

**الحل**:
- افتح `/?sw=off` لإلغاء SW يدوياً.
- أو DevTools → Application → Service Workers → Unregister.
- ثم Hard Reload.

### 3. Loops في refetch

**السبب الأرجح**: realtime channel على `app_settings` يفعّل `invalidateQueries` بشكل عدواني.

**الحل**:
- تحقق من Network filter `app_settings` — هل الطلب يتكرر كل ثانية؟
- شغّل `/dashboard/diagnostics` → بطاقة "اتساق بطاقات اللوحات".
- في وضع التدقيق، لا يجب أن ترى أي realtime activity.

### 4. DevTools نفسه يتجمّد عند فتح Sources

**السبب**: فتح ملف `vendor-pdf*.js` (يحتوي base64 للخطوط ~1MB).

**الحل**: أغلق التبويب، استخدم `Ctrl+P` للبحث بدلاً من تصفح الشجرة.

### 5. فحص واحد يفشل دائماً مع timeout

**الحل**:
- شغّله منفرداً من بطاقته في `/dashboard/diagnostics`.
- افحص Console للأخطاء.
- راجع الملف المسؤول تحت `src/lib/diagnostics/checks/`.

## أين تذهب لكل مشكلة

| المشكلة | الأداة |
|---------|-------|
| بطء صفحة | DevTools Performance + Lighthouse |
| بيانات غير متسقة | `/dashboard/diagnostics` بطاقة "تدقيق رقمي" |
| فاتورة ZATCA لم تُرسل | `/dashboard/diagnostics` بطاقة ZATCA |
| خطأ JS متكرر | `/dashboard/diagnostics` بطاقة "أخطاء التشغيل" |
| RLS يمنع الوصول | `/dashboard/audit-log` + Supabase linter |
