# المرحلة 5 — إغلاق الملاحظات الأمنية المتبقية (11 بنداً)

القاعدة: كل بند يُغلق بإصلاح فعلي + اختبار حقيقي ناجح. لا قفز.

## جدول الإغلاق

| # | البند | الإصلاح | إثبات الإغلاق |
|---|---|---|---|
| 1 | `client-context` في قائمة استخدام مفتاح الخدمة | توثيق المبرّر (فحص الحجب قبل المصادقة، لا بيانات وقفية في الرد) وإضافته لـ `SERVICE_ROLE_ALLOWLIST` | `node scripts/security-gates.mjs` ✅ |
| 2 | تعميم تنقية مدخلات البحث | `src/lib/postgrestFilter.ts` (`sanitizeOrPattern` / `toSafeIlikePattern`) معمّم على `searchService` و `useAccessLogTab` و `useArchiveLog` و `useAuditLog` و `useArchivedDocuments` | `postgrestFilter.test.ts` — 7 اختبارات ✅ |
| 3 | حظر القراءة المباشرة من حزمة `invoices` | هجرة `0002_enforce_zero_invoice_bucket_read_policies` تُسقط 8 سياسات قراءة + حارس `RAISE EXCEPTION` يفشل الترحيل عند بقاء أي سياسة | `storagePolicyRegression.test.ts` 3 ✅ · `securityInvariants.test.ts` 2 ✅ · استعلام `pg_policies` على الاختبار: 0 سياسة SELECT على `invoices` |
| 4 | تدقيق `SECURITY DEFINER` | استعلام تحقق: لا دالة إدارية/مالية بدون `has_role` داخل جسمها | استعلام `pg_proc` رجع مجموعة فارغة ✅ |
| 5 | إلزام Zod في دوال الحافة | كل دالة تقرأ `req.json()` تستخدم `safeParse` (10 دوال) | `securityInvariants.test.ts` — فحص ثابت يفشل عند أي دالة جديدة بدون تحقق ✅ |
| 6 | تحصين `lookup-national-id` | كل الردود قبل المصادقة `***@***.com` + تأخير تدريجي موحّد + رد متطابق (`found:true`) + rate limit ثنائي بمفتاح SHA-256 | `lookup-national-id/index.test.ts` + `validation` ضمن 218 فحص خلفي ✅ |
| 7 | عزل الأدوار | الأدوار من `user_roles` حصراً عبر `fetchUserRole` — لا تخزين محلي | `securityInvariants.test.ts` 2 ✅ |
| 8 | منع تسريب PII في السجلات | فحص أنماط PII داخل `console.*` ضمن `security-gates.mjs` | البوابة خضراء ✅ |
| 9 | عزل قنوات Realtime | `useBfcacheSafeChannel`: قناة واحدة لكل اسم + إسقاط القنوات القديمة + fallback عند تزاحم `subscribe()` + backoff | `bfcacheSafeChannel.test.ts` ✅ |
| 10 | اختبار حجب IP | `IpBlockGuard.test.tsx`: شاشة المنع + تسجيل خروج فوري + fail-open عند تعذّر الفحص | 3 اختبارات ✅ |
| 11 | بصمة الإغلاق والمصفوفة | أدناه | — |

## بصمة التحقق (المصفوفة الكاملة)

| البوابة | النتيجة |
|---|---|
| `tsgo --noEmit` | 0 أخطاء |
| `npx vitest run` | 269 ملفاً / 2263 اختباراً — كلها ناجحة |
| `npm run test:edge` | 218 ناجحاً / 0 فاشل |
| `npx eslint .` | 0 أخطاء · 26 تحذيراً (وظائف الحافة، موثّقة) |
| `npm run quality:dup` | 0.0528% (الحد 0.4%) · 0 استنساخ ≥25 سطراً |
| `node scripts/security-gates.mjs` | 0 مخالفات |
| `npm run check:migrations` | ✅ لا انفصال (398 هجرة) |

## المتبقي (خارج نطاق الإصلاح البرمجي)

- الهجرة `0002` مطبَّقة على قاعدة الاختبار وتنتظر **النشر** لتسري على الإنتاج؛
  حتى ذلك الحين تبقى 7 سياسات قراءة قائمة في الإنتاج على حزمة `invoices`.
  بعد النشر: `npm run verify:deploy` ثم `npm run check:migrations`.
- 6 ملاحظات أمنية لم تُطلب لم تُلمس حسب تعليمات المستخدم.
