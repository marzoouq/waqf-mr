# خطة تعزيز الجودة والاختبارات

## منجز
- [x] المرحلة 1: إصلاح اختبارات دوال الحافة المعطلة (auth, zatca-xml-builder, lookup-national-id, zatca-signer, guard-signup).
- [x] استخراج دوال نقية قابلة للاختبار: `lookup-national-id/validation.ts`، `invoice-file-url/validation.ts`، `_shared/client-ip.ts`.
- [x] المرحلة 2 (مكتملة): 218 اختباراً لدوال الحافة — `invoice-file-url`، `client-context`، `admin-manage-users/validators`، `webauthn/helpers`، `process-email-queue/utils`، و`_shared/auth-guard.contract.test.ts` (13 دالة محمية × 4 فحوص: anon فقط، بدون تفويض، رمز مزوّر، عدم تسريب أسرار).
- [x] إصلاح عطل حقيقي: `diagnostics-edge-ping` كانت تفشل بـBOOT_ERROR (import مثبّت + cors) — أُصلحت ونُشرت.
- [x] المرحلة 3: اختبارات `clientContext`، `accessLogService`، `usePageActivityTracker` (8)، `useAdvanceCalculations` (5)، `useDistributionCalculation` (8).
- [x] المرحلة 4: E2E حقيقية — `maintenance-and-access-guards.spec.ts` (تحكم الناظر بوضع الصيانة مع إعادة الحالة، حرمان غير الناظر، حرّاس الزائر غير المسجّل) و`contract-invoice-cycle.spec.ts` (سلامة شاشات الدورة المالية، منع الأرصدة السالبة، منع الوصول المباشر لملفات الفواتير من التخزين). الاختبارات مدركة للدور: مسارات الناظر تُتخطّى تلقائياً عند غياب جلسة إدارية.
- [x] `playwright.config.ts` يقبل `PLAYWRIGHT_CHROMIUM_EXECUTABLE` للبيئات ذات المتصفح المثبّت مسبقاً (لا أثر على CI).
- [x] المرحلة 5: `npm run test:edge` بوابة إلزامية في `ci.yml` و`test.yml`، وتصحيح نمط E2E في `knip.json` (`tests/e2e`).

## حالة التحقق الأخيرة
- tsgo: 0 أخطاء — ESLint: 0 أخطاء / 26 تحذيراً — jscpd: 0.0528% (الحد 0.4%).
- Vitest: 2263 اختباراً ناجحاً (269 ملفاً) — Edge: 218 ناجحاً — E2E: 17 ناجحاً / 13 متخطّى.
- بوابة الهجرات: لا انفصال (398 ملف هجرة) — بوابة الأمان: 0 مخالفات.
- المرحلة 5: أُغلقت الملاحظات الأمنية الـ11 واحدة تلو الأخرى — `audit/forensics/phases/phase-5-security-findings-closure.md`.

## مفتوح
- [ ] تغطية دوال الحافة الثقيلة منطقياً: `generate-invoice-pdf`، `generate-voucher-pdf`، `mcp`، `ai-assistant`، `auth-email-hook` (تحتاج عزل توليد PDF/AI).
- [ ] تغطية الصفحات المتبقية (41 صفحة) وخطافات الصفحات الكبيرة.
- [ ] E2E لمسار الكتابة الكامل (إنشاء عقد ← فواتير ← سداد ← قيد) وإقفال السنة — يحتاج جلسة ناظر مخصّصة للاختبار.
- [ ] أدوات ناقصة: Lighthouse CI لانحدار الأداء، Mutation testing للمعادلات المالية، مقارنة بصرية لمخرجات PDF.
- [ ] نشر معلّق (حاجز خارجي): هجرات إغلاق قراءة التخزين — آخرها `0002_enforce_zero_invoice_bucket_read_policies` (تُسقط 8 سياسات + حارس يفشل الترحيل عند بقاء أي سياسة). حتى النشر تبقى 7 سياسات قراءة قائمة في الإنتاج. بعد النشر: `npm run verify:deploy` ثم `npm run check:migrations`.
