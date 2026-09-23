# خطة تعزيز الجودة والاختبارات

## منجز
- [x] المرحلة 1: إصلاح اختبارات دوال الحافة المعطلة (auth, zatca-xml-builder, lookup-national-id, zatca-signer, guard-signup) — 148 اختباراً ناجحاً.
- [x] استخراج دوال نقية قابلة للاختبار: `lookup-national-id/validation.ts`، `invoice-file-url/validation.ts`، `_shared/client-ip.ts` (توحيد استخراج IP ومنع التكرار).
- [x] المرحلة 2 (جزئياً): اختبارات حقيقية لـ `invoice-file-url` (path traversal + رفض غير المصادق)، `client-context` (شكل الرد + fail-open + عدم الوثوق بترويسة العميل)، `admin-manage-users/validators`.
- [x] المرحلة 3 (جزئياً): اختبارات `clientContext` و`accessLogService` في الواجهة (14 اختباراً).
- [x] المرحلة 5: أمر `npm run test:edge` + دمجه في `ci.yml` و`test.yml` كبوابة إلزامية.

## مفتوح
- [ ] المرحلة 2 (تكملة): اختبارات `webauthn`, `generate-invoice-pdf`, `generate-voucher-pdf`, `process-email-queue`, `mcp`, `dashboard-summary`, `multi-year-summary`, `year-comparison-summary`, `beneficiary-summary`, `email-admin`, `health-check`, `diagnostics-edge-ping`, `check-contract-expiry`, `ai-assistant`, `auth-email-hook`.
- [ ] المرحلة 3 (تكملة): خطافات `useWebAuthnAuth/Manage/Register`، خطافات صفحات التوزيعات والعقود والحسابات، و41 صفحة بلا اختبارات مستقلة.
- [ ] المرحلة 4: اختبارات E2E — دورة العقد (إنشاء ← فواتير ← سداد ← قيد)، إقفال السنة والتوزيع، وضع الصيانة وحجب IP.
- [ ] أدوات ناقصة: Lighthouse CI لانحدار الأداء، Mutation testing للمعادلات المالية، مقارنة بصرية لمخرجات PDF.
- [ ] نشر معلّق: هجرة `drop_legacy_open_storage_read_policies` + الهجرات المتأخرة، ثم `npm run verify:deploy` و`npm run check:migrations`.
