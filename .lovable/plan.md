## خطة الإصلاح الجراحية (3 بنود حقيقية فقط)

تم التحقق الجنائي من التقرير. التفاصيل في الرد السابق. **النفّذ التالي يخصّ البنود الصحيحة فقط** ولا يمسّ مكونات سليمة.

### 1. defense-in-depth: تشديد route guard لـ `/dashboard/comparison`
`src/routes/adminRoutes.tsx` السطر 48: تغيير `pr(ADMIN_ROLES, …)` إلى `pr(ADMIN_ONLY, …)` ليطابق `users`/`settings`/`zatca`/`diagnostics`/`email-monitor`. لو وصل المحاسب رابطاً مباشراً يُحوَّل لـ `/unauthorized`.

### 2. كسر silent fail في `accessLogService`
`src/lib/services/accessLogService.ts`: استبدال `catch {}` بـ `catch (e) { logger.warn(...) }` مع import `logger` من `@/lib/logger`. لا يكسر تدفق المستخدم لكنه يكشف الأعطال للتشخيص.

### 3. اختبار عقد role boundaries (ملف جديد)
`src/test/roleBoundaryContract.test.ts` يحرس:
- `ADMIN_ONLY === ['admin']`
- `ADMIN_ROLES === ['admin', 'accountant']`
- كل المسارات الإدارية الحساسة موجودة في `ACCOUNTANT_EXCLUDED_ROUTES` (users, settings, zatca, diagnostics, email-monitor, comparison).
- لا تسرّب لمسارات `/beneficiary/*` ضمن قائمة استبعاد المحاسب.

### بنود مرفوضة عمداً (لن أنفّذها)
- إنشاء `accountantRoutes.tsx` منفصل (إعادة تنظيم ضخمة بلا قيمة وظيفية).
- إزالة نمط `admin || accountant` من 30+ ملف (رأي تنظيمي).
- نقل `useDashboardPrefetch` خارج `FiscalYearProvider`.
- تعديل `useBeneficiariesDecrypted` (مقصود ومحمي بـ RLS).
- حصر `AiAssistant` على admin فقط.