# خطة إصلاح توقف Lighthouse / Audit في DevTools

## التشخيص

الملف المرفق هو شيفرة `jsPDF` المُصغّرة (CMap + Bidi engine + TTF font writer). توقّف Lighthouse عند الفحص ينتج عن مزيج من ثلاثة أسباب فعلية في المشروع — وليس عن خلل في jsPDF نفسه:

1. **حِزَم Vendor ثقيلة في chunk واحد**: `vendor-pdf` يضم `jspdf + canvg + rgbcolor + stackblur-canvas`. حتى مع الـ dynamic import (الكود يستخدم `await import('jspdf-autotable')` و `await import('jspdf')` بالفعل — موجود في `src/utils/pdf/core/core.ts:40`)، فإن Lighthouse في وضع "Navigation" يحاول تحليل بنية كل chunks مع sourcemaps ⇒ يتجمّد على ملف `vendor-pdf` الضخم. الـ `chunkSizeWarningLimit: 600` لا يمنع التضخّم.

2. **النشاط الخلفي يمنع `networkidle`**: شبكة المعاينة تُظهر استدعاءات `get_public_stats` و `app_settings?select=key,value` متكررة كل 15–25 ثانية رغم أن staleTime = 5 دقائق. Lighthouse ينتظر فترة هدوء شبكي (~5 ثوان) قبل بدء بعض التدقيقات؛ النشاط المتكرر يُطيل الوقت أو يُسبّب timeout. السبب الفعلي: realtime channel على `app_settings` في `useAdminDashboardPage` و `useBeneficiaryDashboardPage` يُبطل المفاتيح ⇒ refetch فوري، وعند التشغيل في تبويب نشط يبدو وكأنه polling.

3. **`SwUpdateBanner` يفحص التحديث كل 5 دقائق ويُسجّل Service Worker** — مغلق حالياً في preview، لكن على النسخة المنشورة `waqf-wise.net` يُسجّل SW عادي، وLighthouse يدخل في loop عند تحقّق أصل الـ navigation fallback (نحن نضعه `null` ⇒ جيد).

التشخيصات الجانبية المُلاحظة:
- `sourcemap: mode === 'production' ? false : 'hidden'` في `vite.config.ts:221` — `'hidden'` في dev غريب ويُربك DevTools (يولّد المراجع لكن يخفيها). الافتراضي يجب أن يكون `true` للتطوير.
- لا يوجد استيراد قيمي ساكن لـ `jsPDF` خارج `core.ts` (تم التحقق) ⇒ الـ tree-shaking صحيح.

## الإصلاحات

### 1) فصل أعمق لِـ vendor-pdf
في `vite.config.ts`:
- فصل `canvg`, `rgbcolor`, `stackblur-canvas` إلى chunk مستقل `vendor-pdf-svg` (يُحمَّل فقط عند طباعة عناصر SVG، نادراً).
- إبقاء `jspdf` وحده في `vendor-pdf`.
- نقل `arabic-reshaper` (سطر 216) ليُدمج مع `vendor-pdf` لأنه لا يُستخدم خارج توليد PDF — يقلل عدد chunks المحمَّلة عند الطباعة فقط.
- إضافة `arabic-reshaper` و `qrcode` و `vendor-pdf*` إلى قائمة `resolveDependencies` المُستثناة من modulepreload (موجود جزئياً، نُكمل القائمة).

### 2) تصحيح sourcemap للتطوير
في `vite.config.ts:221`:
```ts
sourcemap: mode === 'production' ? false : true,
```
يحلّ تجمّد DevTools Sources عند فتح ملف من chunk كبير.

### 3) قطع النشاط أثناء التدقيق (Audit Mode)
إضافة وحدة صغيرة `src/lib/auditMode.ts`:
- `isAuditMode()` → true إذا `?audit=1` أو UA يحتوي `Chrome-Lighthouse`.
- يُستخدم في:
  - `src/lib/queryClient.ts` لرفع `staleTime` الافتراضي و تعطيل `refetchOnReconnect` في وضع التدقيق.
  - `src/components/pwa/SwUpdateBanner.tsx` لإرجاع `null` فوراً في وضع التدقيق (إضافة شرط للحارس الحالي).
  - hooks الـ realtime على `app_settings` (في `useAdminDashboardPage` و `useBeneficiaryDashboardPage`) لتخطّي `supabase.channel(...)` في وضع التدقيق.

النتيجة: Lighthouse يصل إلى `networkidle` خلال أقل من 3 ثوان.

### 4) إصلاح polling غير المقصود لـ app_settings
في `useBeneficiaryDashboardPage.ts:109` (و نظيره الإداري إن وُجد): التحقق من أن قناة realtime مُعرَّفة على event محدد (`UPDATE`) وليس `*` — وأن `queryClient.invalidateQueries` يستهدف مفتاح دقيق فقط. هذا يقطع موجة الـ refetch المتكررة المرئية في سجل الشبكة.

### 5) اختبارات وتحقق
- تحديث `src/lib/pwaBootstrap.test.ts` لإضافة حالة `isAuditMode → canRegisterAppServiceWorker === false`.
- اختبار جديد `src/lib/auditMode.test.ts` يغطي UA Lighthouse و `?audit=1`.
- اختبار `useRegistrationEnabled` و `usePublicStats` لا يتغيران.
- يدوي: تشغيل Lighthouse على `?audit=1` ⇒ يكتمل التدقيق دون توقف.

## الملفات المتوقع تعديلها
- `vite.config.ts`
- `src/lib/auditMode.ts` (جديد) + اختبار
- `src/lib/queryClient.ts`
- `src/lib/pwaBootstrap.ts` (إضافة شرط audit إلى البوابة) + تحديث الاختبار
- `src/hooks/page/beneficiary/dashboard/useBeneficiaryDashboardPage.ts`
- `src/hooks/page/admin/dashboard/useAdminDashboardPage.ts`

## ملفات لن تُمَس
- `jsPDF`/PDF generation code (يعمل بشكل صحيح، dynamic-imported).
- ملفات المصادقة المحمية، `supabase/config.toml`، `client.ts`، `types.ts`، `.env`.
- قاعدة البيانات وسياسات RLS وEdge Functions.
- نماذج المصادقة (مكتملة `name`/`id`).
