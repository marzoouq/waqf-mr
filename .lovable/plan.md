# تشغيل الاختبارات الكاملة + عرض النتائج في صفحة تقرير

## الخطوات

### 1. تشغيل البناء والاختبارات (في build mode)
- `npm run build` — تأكيد عدم وجود أخطاء bundle بعد حذف الملفات الأربعة.
- `bunx vitest run --reporter=json --outputFile=/tmp/vitest-results.json` — تشغيل كامل الـ 2060 اختبار.
- استخراج: `numTotalTests`, `numPassedTests`, `numFailedTests`, قائمة الفاشلة (file + name + رسالة)، وأي تحذيرات stderr.
- إن فشل أي اختبار: إيقاف فوري وإبلاغ المستخدم قبل أي إنشاء صفحة.

### 2. إنشاء صفحة التقرير (Admin only)

**ملفات جديدة:**
- `src/constants/cleanupReport.ts` — snapshot ثابت:
  ```ts
  { generatedAt, deletedFiles: [{path, reason}],
    rgChecks: [{pattern, matches}],
    build: { status: 'pass'|'fail', durationMs?, errors? },
    tests: { total, passed, failed, skipped, durationMs,
             failures: [{file, name, message}] } }
  ```
  تُملأ بالنتائج الفعلية من الخطوة 1.
- `src/pages/dashboard/CleanupReportPage.tsx` (≤180 سطر، presentational):
  - `DashboardLayout` + `PageHeaderCard` + أيقونة `ClipboardCheck`.
  - بطاقات ملخص: محذوف / rg / build / tests (لون أخضر/أحمر حسب النتيجة).
  - جدول الملفات المحذوفة + جدول فحوصات rg.
  - قسم تفصيلي للاختبارات الفاشلة (إن وُجدت) مع file/name/message.
  - زر طباعة PDF عبر `usePrint`.
- `src/components/dashboard/cleanup/CleanupSummaryCards.tsx` (4 بطاقات).
- `src/components/dashboard/cleanup/TestFailuresList.tsx` (قائمة فاشلة، فارغة إن `failed=0`).

**ملفات معدَّلة:**
- `src/routes/adminRoutes.tsx` — مسار `/dashboard/cleanup-report` بحارس `ADMIN_ONLY` + lazy load.
- `src/pages/dashboard/AuditReportFinalPage.tsx` — زر "تقرير التنظيف الأخير".

## القيود الحقيقية

- **لا يمكن** تشغيل vitest في runtime من المتصفح — الاختبارات تُشغَّل في sandbox الـ build فقط، ونتائجها تُخزَّن في `cleanupReport.ts` كـ snapshot.
- التقرير يعكس **آخر جولة تنظيف**؛ يُحدَّث يدوياً في كل جولة قادمة (لا نظام CI داخل التطبيق).

## خارج النطاق
- لا تعديل على RLS أو السنة المالية.
- لا تنفيذ rg/build/tests من واجهة المستخدم runtime.
- لا حذف ملفات إضافية.
