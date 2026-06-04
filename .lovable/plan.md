# خطة الجولات — مكتملة ✓

## Round A — UI/Data separation ✓
## Round B — Zod for Edge Functions ✓ (admin-manage-users, lookup-national-id, generate-invoice-pdf, auth-email-hook /preview)
## Round C — Realtime + Perf ✓ (bfcacheSafeChannel + EXPLAIN ANALYZE)

## Round D (cleanup) ✓
- `auth-email-hook` /preview: Zod (PreviewBodySchema) + 400
- حذف ملفات backward-compat الميتة:
  - `src/components/ui/RtlPortal.tsx`
  - `src/hooks/data/core/crudFactory.types.ts`
  - 11 barrels فارغة (`src/components/dashboard/{charts,kpi,views,widgets}/index.ts`, `src/hooks/page/beneficiary/{dashboard,financial,messaging,notifications,settings,views}/index.ts`, `src/hooks/page/admin/settings/index.ts`)
  - `src/utils/pdf/invoices/invoices.test.ts` (test فارغ)
- توحيد `ConfirmDialog`: تم سابقاً — `ContractDeleteDialog`, `PropertyDeleteDialog`, `BylawDeleteDialog` أصبحت wrappers رقيقة فوق `ConfirmDeleteDialog`

## مؤجَّل (يحتاج جولة منفصلة آمنة)
- تقسيم الملفات > 200 سطر (الأكبر: `aggregatedAnnualReport.ts` 274، `useContractForm.ts` 227) — يتطلب تغطية اختبارات أعمق قبل التقسيم
- ضبط `knip` لتجاهل `supabase/functions/` و dynamic imports عبر barrels قبل اعتمادها في CI

## التحقق ✓
- `bunx tsc --noEmit`: نظيف
- `bunx vitest run`: 1935/1935 ✓
- `auth-email-hook` تم نشره
