## الهدف
إصلاح الاختبارين الفاشلين في `dashboardRoutesContract.test.ts` بإضافة طبقة page-hook لكلتا الصفحتين (`AuditReportFinalPage`, `CleanupReportPage`) بحيث تستوردان hook من `@/hooks/page/...` بدلاً من استدعاء `usePrint` مباشرةً.

## التغييرات

### 1. إنشاء hooks جديدة تحت `src/hooks/page/admin/reports/`
- **`useAuditReportFinalPage.ts`** — يستدعي `usePrint` ويُرجع `{ print, handlePrint }` (و`handleOpenCleanupReport` للتنقل إن لزم).
- **`useCleanupReportPage.ts`** — يستدعي `usePrint` ويُرجع `{ print, handlePrint, report }` حيث `report` ثابت `CLEANUP_REPORT` من `@/constants/cleanupReport`.

السلوك المُغلَّف:
- استدعاء `usePrint()`
- دالة `handlePrint` تستدعي `print.printElement(ref)` (إن كان النمط الحالي يستخدم ref) أو `print.print()` حسب التوقيع الحالي.

### 2. تعديل الصفحتين
- إزالة `import { usePrint }` المباشر.
- استبداله بـ `import { useAuditReportFinalPage } from '@/hooks/page/admin/reports/useAuditReportFinalPage'` (والمماثل لتقرير التنظيف).
- استخدام القيم المُعادة من الـ hook دون تغيير الـ JSX/العرض.

### 3. التحقق
- `bunx vitest run src/test/dashboardRoutesContract.test.ts` → اختباران فاشلان يصبحان أخضرَين.
- `bunx vitest run` كاملاً → 2076/2076.

## الملفات
- **جديد:** `src/hooks/page/admin/reports/useAuditReportFinalPage.ts`
- **جديد:** `src/hooks/page/admin/reports/useCleanupReportPage.ts`
- **معدّل:** `src/pages/dashboard/AuditReportFinalPage.tsx`
- **معدّل:** `src/pages/dashboard/CleanupReportPage.tsx`

## خارج النطاق
- لا تغيير في `usePrint` نفسه (يبقى في `@/hooks/ui/`).
- لا تغيير في المنطق، الـ JSX، التوجيه، أو الصلاحيات.
