# خطة تنفيذ التوصيات الإحدى عشرة

تنفيذ مرتّب على 5 مراحل، كل مرحلة قابلة للمراجعة منفصلة. لن تُلمس الملفات المحمية ولا الـ DB ولا منطق الأعمال.

## المرحلة 1 — تنظيم الهوكات (P1)

### 1.1 تهجير `hooks/page/shared/` (#2)
- نقل `src/hooks/page/shared/notifications/useNotificationPreferences.ts` → `src/hooks/application/messaging/useNotificationPreferences.ts`.
- تحديث المستورد الوحيد: `src/components/settings/messaging/NotificationsTab.tsx`.
- حذف مجلد `src/hooks/page/shared/` بالكامل.

### 1.2 تقسيم `useContractForm.ts` (#3) — 227 سطر → 3 ملفات
- استخراج `useContractFormValidation` (التحقق + قواعد الأسعار).
- استخراج `useContractFormSubmit` (إرسال + معالجة الأخطاء + invalidate).
- إبقاء `useContractForm` كـ orchestrator صغير (<120 سطر).

### 1.3 تقسيم `usePropertiesViewPage.ts` و `useAnnualReportPage.ts` (#4)
- استخراج `usePropertiesFilters` من `usePropertiesViewPage` إلى نفس المجلد.
- نقل الحسابات من `useAnnualReportPage` إلى `hooks/domain/financial/useAnnualReportCalc.ts`.

**معايير القبول**: كل هوك ≤200 سطر، الاختبارات الحالية تمر، 0 Critical في `npm run audit`.

---

## المرحلة 2 — إعادة تنظيم المكوّنات (P2)

### 2.1 تقسيم `src/components/common/` (#5)
- إنشاء `common/feedback/` (EmptyState, ErrorBoundary, PageStateGuards, SkeletonLoaders, BetaBanner, ConfirmDeleteDialog, DiagnosticOverlay, WebVitalsPanel).
- `common/layout/` (PrintHeader, PrintFooter, LegalPageFooter, MobileCardView).
- `common/forms/` (ViewModeToggle, ExportMenu).
- `common/tables/` (TablePagination, CrudPagination, TableSkeleton).
- إبقاء `common/finance/` كما هو.
- تحديث `components/common/index.ts` (البارّل) ليُعيد التصدير من المسارات الجديدة (لا تغيير في الاستيرادات الخارجية).

### 2.2 تجميع dashboard المسطح (#6)
- إنشاء `src/components/dashboard/shell/`.
- نقل `AiAssistant.tsx`, `AdvancedFiltersBar.tsx`, `DashboardLazySection.tsx` إليه.
- تحديث المستوردين (grep + replace).

**معايير القبول**: build + tests خضراء، لا تغيير سلوكي.

---

## المرحلة 3 — تشديد البوابة وقواعد الـ Audit (P3)

### 3.1 منع `hooks/page/shared/` مستقبلاً (#8)
- إضافة قاعدة في `scripts/audit-hooks-layout.mjs` ترفع Critical إذا ظهر أي ملف تحت `src/hooks/page/shared/**`.

### 3.2 حد صارم 250 سطر للمكونات (#9)
- في `scripts/audit-conventions-deep.mjs`: ترقية `HookSize` لتشمل مكوّنات > 250 سطر كـ Warning، و> 300 كـ Critical.

### 3.3 README لطبقتي `utils/auth` و `utils/contracts` (#7)
- إضافة `src/utils/auth/README.md` و `src/utils/contracts/README.md` بفقرتين توضحان الحد مقابل `lib/auth` و `lib/contracts`.

---

## المرحلة 4 — CI سحابي (P4)

### 4.1 ربط بوابة Audit بـ GitHub Actions (#10)
- إضافة خطوة `npm run audit && npm run audit:gate` إلى `.github/workflows/ci.yml` بعد خطوة `UI permissions audit` الموجودة.
- رفع `audit/report.html` كـ artifact.

### 4.2 خريطة طبقات Mermaid (#11)
- إنشاء `audit/architecture-map.md` بمخطط Mermaid يوضّح:
  Pages → hooks/page → hooks/data + hooks/domain → lib + utils → integrations/supabase.

---

## المرحلة 5 — التحقق النهائي

- `npm run audit` → 0 Critical, 0 GAP, ≤7 Info.
- `npm run audit:gate` (Vitest) → PASS.
- تشغيل suite الاختبارات للتأكد من عدم وجود انحدارات.
- تحديث `audit/structure-deep-review.md` بالحالة الجديدة.

---

## خارج النطاق

- لا تعديل على `src/integrations/**`, `supabase/migrations/**`, `supabase/config.toml`, `AuthContext`, `ProtectedRoute`.
- لا تغيير في منطق الأعمال (الحسابات المالية، RLS، Edge Functions).
- البند #1 لا يحتاج عمل.

## ترتيب التسليم

كل مرحلة تُسلَّم في commit/رسالة منفصلة (5 جولات تنفيذ). يمكن إيقاف الخطة عند أي مرحلة دون كسر التي قبلها.