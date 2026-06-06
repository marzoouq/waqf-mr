# تقرير تدقيق قاعدة الكود — 2026-06-06

> تدقيق **قراءة فقط** لـ 1,224 ملف عبر `src/`. لا تعديلات على الكود — توصيات فقط.

## 1. الحالة العامة (CI أخضر بالكامل)

| المؤشر | القيمة |
|---|---|
| Critical violations | **0** |
| Warning | **0** |
| GAP (handlers / permissions / page-controls) | **0** |
| Info (مسموح) | 4 ألوان Hex داخل Canvas/PDF (`SignaturePad`, `InvoicePreviewDialog`) |
| TODO / FIXME / HACK | **0** |
| `@ts-ignore` / `@ts-expect-error` | 3 فقط |
| `any` خارج الاختبارات | **1** (`utils/pdf/core/pdfHelpers.ts`) |
| Pages تستورد `hooks/data` كقيمة | **0** (الوحيد type-only في `AnnualReportPage`) |
| Hooks تستورد من `pages/**` | **0** |
| ملفات > 200 LOC | 17 (كلها مبرّرة) |

**الخلاصة:** البنية ناضجة وصحية. لا انتهاكات معمارية حرجة. التوصيات أدناه **تحسينات تجميلية** فقط.

## 2. ما تم فحصه

1. `node scripts/audit-all.mjs` — سلسلة كاملة (structure + conventions-deep + hooks-layout + ui-permissions + page-controls + build-report). النتيجة: Critical 0 · GAP 0 · Info 4.
2. **توزيع الطبقات** (1,224 ملف): 459 component · 160 util · 130 hook-data · 111 hook-page · 94 lib · 67 page · 56 test · 24 hook-auth · 19 hook-domain · 18 hook-ui · 14 hook-application.
3. **الـ17 ملفاً > 200 LOC:** 1 مولّد (`integrations/supabase/types.ts` = 2610) · 9 اختبارات (الحد لا يطبَّق عليها) · 4 PDF/diagnostics · 3 hooks في نطاق 201-220.
4. **مؤشرات إضافية:** `any` types · TODOs · استيرادات عابرة للطبقات · اعتمادات circular · حدود lib/utils.

## 3. التوصيات (مرتّبة من الأهم للاختياري)

### P0 — لا شيء
لا توجد انتهاكات حرجة تستدعي التدخل.

### P1 — تحسينات معمارية مفيدة (اختياري)

1. **مراجعة 65 مكوّناً يستورد `@/hooks/data` مباشرة.**
   - بعضها container طبيعي (جداول، حوارات CRUD)؛ لا انتهاك بالقاعدة الحالية.
   - الإجراء: مسح القائمة لتحديد ما إذا كان أحدها من المفترض أن يكون presentational فقط ويأخذ البيانات عبر props.
   - لا فرض قسري — `Container vs Presentational` يسمح بذلك للحاويات.

2. **استبدال `any` الوحيد في `utils/pdf/core/pdfHelpers.ts`** بنوع `jsPDF` المناسب أو `unknown` + type guard.

3. **توثيق الـ3 `@ts-ignore` المتبقية** بتعليق سبب التجاوز (إن لم يكن موجوداً).

### P2 — تنقية مكتبة الاختبارات (اختياري)

4. **توحيد 9 ملفات اختبار > 200 سطر** (financialIntegration, accountsCalculations, useComputedFinancials …) بتقسيم بحسب suite منطقي. حالياً تقرأ كـ "monolith" لكنها لا تكسر أي قاعدة (size limit لا يطبَّق على `.test.*`).

5. **إصلاح الاختبارين flaky** في `useNotificationActions.test.ts:130-133` (timing لـ `toast.error`) — يُفشل CI أحياناً.

### P3 — تجميل (يمكن تجاهلها)

6. **مراجعة 4 ملفات إنتاج > 200 سطر** (لا حرج معماري):
   - `utils/pdf/reports/aggregatedAnnualReport.ts` (275)
   - `lib/services/diagnosticsReadService.ts` (220)
   - `utils/financial/collectionCompute.ts` (199 — قريب من الحد)
   - `lib/services/fiscalYearService.ts` (196 — قريب)
   - الإجراء المحتمل: استخراج helpers خاصة بكل تقرير في `aggregatedAnnualReport.ts` إلى ملفات مجاورة.

7. **توسيع `audit/architecture-map.md`** ليعكس التقسيمات الجديدة بعد جولة 2026-06-05 (`accrual/`, `accounts/contracts/`, `pwa/`, `disclosure/`).

### P4 — اختياري لخفض ديون فنية (لا قيمة عاجلة)

8. **بند P2.1 المؤجَّل سابقاً** — تحويل 4 form hooks بـ 6+ `useState` (`useUserManagementForms`, `useBylawsForms`, `useAuditLogPage`, `useCreateInvoiceForm`) إلى `useReducer`. تحسين تجميلي بلا قيمة وظيفية.

## 4. مصادر التقرير

- `audit/codebase-audit-2026-06-05.md` — التقرير السابق المُنفَّذ بالكامل (8/9 بنود).
- `audit/structure-inventory.md` + `.csv` — جرد الطبقات.
- `audit/conventions-deep-report.md` + `.csv` — انتهاكات الأنماط (4 Info فقط).
- `audit/hooks-layout-report.md` — 0 issues.
- `audit/page-controls-audit.md` — 0 GAP.
- `audit/ui-permissions-audit.md` — 0 GAP.
- `audit/report.html` — تقرير HTML مدمج.

## 5. مقارنة مع التقرير السابق

| الفحص | 2026-06-05 (قبل) | 2026-06-05 (بعد) | 2026-06-06 |
|---|---|---|---|
| Critical | 0 | 0 | **0** |
| Warning | 0 | 0 | **0** |
| Info | 5 | 4 