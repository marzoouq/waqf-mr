# تقرير تدقيق المعمارية (Read-Only Audit)

## الخلاصة التنفيذية
الصحة المعمارية: **9.6/10** — المشروع نظيف ومُنظّم بشكل ممتاز بعد جولات P1/P2/P3 السابقة. لا توجد مشاكل حرجة. ما تبقى تحسينات صغيرة معظمها استكمال لخطة سابقة لم تكتمل تنفيذياً.

## ما هو نظيف بالفعل (موثَّق بالفحص)
- **حدود utils/lib محترمة**: لا ملف داخل `src/utils/` يستورد `sonner` أو `supabase/client` (طبقاً لـ `lib-vs-utils-boundary`).
- **لا `console.*` ولا `: any` في كود الإنتاج** — الـ logger مُعتمد كلياً.
- **لا TODO/FIXME/HACK** في الشجرة.
- **لا "صفحات إله"** — أكبر صفحة 198 سطر، ولا صفحة تتعدى 20 import.
- **لا "مودولات إله"** — لا ملف يستورد >25 شيء.
- **طبقة `hooks/data/` منظمة بـ 14 نطاق** (financial, contracts, invoices, ...) وكلها تمر عبر `createCrudFactory`.
- **طبقة `lib/services/` موثّقة** في README مع جدول واضح للمسؤوليات.
- **`hooks/financial/` (المُعاد تسميته)** موجود بـ 16 ملف ومستخدم في 11 مكان بالمسار الجديد.

## النتائج (من الأهم إلى الاختياري)

### P1 — لا شيء حرج ✅

### P2 — استكمال غير مكتمل من الجولة السابقة
1. **`src/hooks/financial/README.md` لا يزال يقول `# hooks/computed/`** على السطر الأول، ويشرح بأنه "أُعيد تسميته إلى computed" — بينما الواقع عكس ذلك (computed → financial). توثيق مضلِّل تماماً.

### P3 — كسر طبقي بسيط (مؤكَّد)
2. **`src/lib/notifications/beneficiaryNotificationVisibility.ts:9`** يستورد:
   ```
   import type { NotificationSettings } from '@/hooks/data/settings/useNotificationSettings';
   ```
   `lib/` لا يجب أن يعتمد على `hooks/`. حلّه: نقل interface `NotificationSettings` إلى `src/types/notifications.ts` وتحديث المستوردَين (lib + hook).

### P4 — تسرّب أنواع نطاق (Domain types) داخل ملفات hooks
3. **`BylawEntry`** مُعرَّف داخل `src/hooks/data/content/useBylaws.ts`. مستخدم أيضاً في `useBylawsPage.ts`.
4. **`ZatcaCertificateSafe`** مُعرَّف داخل `src/hooks/data/zatca/useZatcaCertificates.ts`.
   - يفضّل نقلهما إلى `src/types/` (مثلاً `src/types/bylaws.ts`، وضمّ الثاني إلى `src/types/zatca.ts` الموجود) مع `export type` احتياطي من ملفات الـhook لضمان توافق المستهلكين.

### P5 — ملاحظات اختيارية (تحسين، ليس مشكلة)
5. **نمط `components → hooks/page`** مُستعمل في 28 مكوّن. هذا قرار معماري معتمد لمكوّنات "Container/Tab" (مثل `PaymentInvoicesTab`، `CollectionReport`) وليس انتهاكاً، لكنه يستحق توثيقاً صريحاً في `src/components/README.md` (إن لم يكن موجوداً) لمنع الالتباس مستقبلاً.
6. **أكبر 5 ملفات utils PDF** (>200 سطر) مرشّحة لتقسيم تجميلي:
   - `utils/pdf/reports/forensicAudit.ts` (238)
   - `utils/pdf/reports/comprehensiveBeneficiaryTables.ts` (213)
   - `utils/export/printDistributionReport.ts` (213)
   - `utils/export/xlsx.ts` (205)
   - ليست مشكلة عاجلة (دوال PDF/XLSX طبيعي أن تكون طويلة)، لكن يمكن استخراج helpers مشتركة لو احتجنا تكرار النمط.

## خطة التنفيذ المقترحة (مرتّبة بالأولوية)

| # | البند | الحجم | مخاطرة |
|---|-------|-------|--------|
| 1 | إصلاح `hooks/financial/README.md` (P2) | ملف واحد | صفر |
| 2 | نقل `NotificationSettings` إلى `src/types/notifications.ts` (P3) | 3 ملفات | منخفضة |
| 3 | نقل `BylawEntry` و `ZatcaCertificateSafe` إلى `src/types/` (P4) | 4-5 ملفات + re-exports | منخفضة |
| 4 | (اختياري) إضافة قسم في `src/components/README.md` يوثّق نمط Container/Tab | ملف توثيق | صفر |
| 5 | (اختياري ومؤجَّل) تقسيم ملفات PDF/XLSX الكبيرة | 4-5 ملفات | متوسطة (يحتاج اختبارات) |

## الخيارات للموافقة

- **خيار A (موصى به)**: تنفيذ البنود 1+2+3 — استكمال نظيف لخطة P2/P3/P4 السابقة، صفر تغيير سلوكي، تأثير مباشر على نظافة المعمارية.
- **خيار B**: تنفيذ البند 1 فقط (إصلاح README) — أصغر حركة ممكنة.
- **خيار C**: تنفيذ A + البند 4 (توثيق نمط Container/Tab).
- **خيار D**: لا تغييرات — الحالة الحالية مقبولة (الانحرافات صغيرة جداً).

## تفاصيل تقنية للبنود 1-3

**البند 1**: استبدال السطر 1 من `src/hooks/financial/README.md` ليصبح `# hooks/financial/ — منطق الأعمال المالي المحسوب`، وتحديث الجدول والملاحظة الأخيرة لتعكس أن `computed` كان الاسم القديم.

**البند 2**: 
- إنشاء `src/types/notifications.ts` يحتوي `export interface NotificationSettings { ... }`.
- تعديل `src/hooks/data/settings/useNotificationSettings.ts` ليستورد منه ويعيد تصديره (`export type { NotificationSettings } from '@/types/notifications'`).
- تعديل `src/lib/notifications/beneficiaryNotificationVisibility.ts` ليستورد من `@/types/notifications`.

**البند 3**:
- نقل `BylawEntry` من `useBylaws.ts` إلى `src/types/bylaws.ts` + re-export.
- نقل `ZatcaCertificateSafe` من `useZatcaCertificates.ts` إلى `src/types/zatca.ts` (موجود) + re-export.
- لا يُمسّ أي مستهلك آخر.