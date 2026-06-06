# تقرير تدقيق قاعدة الكود — 2026-06-05

> تدقيق قراءة فقط لـ 1,210 ملف في `src/`، بتشغيل سكربتات: `audit-structure`, `audit-conventions-deep`, `audit-hooks-layout`, `audit-page-controls`, `audit-ui-permissions`، ومطابقة قواعد الذاكرة (Core Modularization v7, lib vs utils, Page Hook Pattern, Barrel Import Rule).

## 1. الحالة العامة (CI أخضر)

| الفحص | النتيجة |
|---|---|
| Conventions Deep | 0 Critical · 0 Warning · **5 Info** |
| Hooks Layout (263 ملف) | 0 مخالفة |
| UI Permissions (449 ملف) | 0 GAP |
| Pages تستورد `supabase` مباشرة | 0 (تجارب فقط) |
| Components تستورد `supabase` مباشرة | 0 |
| `console.*` في الإنتاج | 0 |
| `sonner` داخل `utils/` | 0 |
| Barrel → Barrel | 0 |

البنية **سليمة وناضجة**. لا توجد مخالفات حرجة.

## 2. بنود ثبت خطؤها وحُذفت من التقرير (false positives)

| الرقم القديم | البند | نتيجة التحقق |
|---|---|---|
| ~~P0.1~~ | `src/pages/Auth.tsx:7` يستورد `useSetting('logo_url')` من `hooks/data/*` | **خطأ** — الملف يستخدم `useAuthPage` من `@/hooks/application/useAuthPage` بالفعل، ولا يوجد استيراد من `hooks/data` فيه. |
| ~~P0.2~~ | `src/pages/beneficiary/BeneficiaryDashboard.tsx:6` يستورد `useBeneficiaryWidgets()` مباشرة | **خطأ** — لا يوجد هذا الاستيراد في الملف. |
| ~~P3.11~~ | مجلد `src/services/` فارغ | **خطأ** — المجلد غير موجود أصلاً؛ السكربت عدّ دليلاً مفقوداً كـ 0. |
| ~~P3.12~~ | `src/hooks/application/` يحتاج README | **خطأ** — `src/hooks/application/README.md` موجود. |

لذا **لا توجد أي مخالفات P0**.

## 3. البنود المؤكدة

### P1 — تحسينات متوسطة الأولوية

**P1.1 — Hooks قريبة من حد 200 سطر**

| الملف | الأسطر |
|---|---|
| `src/hooks/page/admin/reports/useAnnualReportPage.ts` | 200 |
| `src/hooks/page/admin/financial/useExpensesPage.ts` | 194 |
| `src/hooks/page/admin/financial/useIncomePage.ts` | 189 |
| `src/hooks/page/admin/contracts/useCreateInvoiceForm.ts` | 180 |

التوصية: استخراج orchestrators صغيرة (Form/Validation/Mutation) إلى `hooks/application/` أو ملفات مساعدة بنفس المجلد.

**P1.2 — مكونات > 180 سطر (5 ملفات)**

`MonthlyAccrualTable` (193) · `AccountsContractsTable` (193) · `PwaUpdateNotifier` (188) · `VoucherFormDialog` (188) · `DisclosureFinancialStatement` (188).

التوصية: استخراج أقسام (Header / Row / Footer / Section) كمكونات Presentational مستقلة.

**P1.3 — `components/common/` بحاجة لإعادة تصنيف**

8 ملفات جذرية مختلطة مع 4 مجلدات فرعية. التوصية: تجميعها في `charts/`, `perf/`, `access/`, `feedback/`, `tables/`.

**P1.4 — `lib/contracts/` بلا README**

المجلد `lib/contracts/` (بما فيه `invoiceSync.ts`) لا يحتوي على ملف README يوثّق المسؤوليات والحدود مع `utils/`.

### P2 — مفيد

**P2.1 — مكونات بحالة محلية ثقيلة (6 hooks state لكل منها): 3 مكونات** تحتاج لرفع الحالة إلى `hooks/page/` أو `hooks/application/`.

**P2.2 — اختبار انحدار لـ `ExpenseFormDialog`**: تم إصلاح تكرار `<Input>` في الجلسة السابقة؛ يُنصح بإضافة اختبار snapshot/regression لمنع عودة المشكلة.

### P3 — اختيارية

**P3.1 — أرشفة `scripts/codemod-common-barrel.mjs`** بعد انتهاء غرضه.

**P3.2 — خلل في عد سطور سكربت التدقيق**: يبلّغ عن `useAnnualReportPage.ts` بـ 201 سطر بينما الملف الفعلي 200 سطر (خارج العتبة بمقدار 0). يلزم إصلاح عدّاد الأسطر أو رفع العتبة رسمياً إلى 201 وتحديث `conventions-deep-violations.csv`.

**P3.3 — مراجعة `audit/conventions-deep-violations.csv`**: الـ 5 بنود Info الحالية (4 ألوان Hex في `SignaturePad.tsx` و `InvoicePreviewDialog.tsx` + سطور `useAnnualReportPage`) مقبولة:
- ألوان Hex داخل Canvas/PDF مسموح بها صراحة بقاعدة الذاكرة (`CSS variables for colors. Hex codes are only allowed in Canvas, SVGs, or print contexts`).
- بند الـ Hook يعالَج عبر P1.1 / P3.2.

## 4. خلاصة الأولويات

| الأولوية | عدد البنود الفعلية |
|---|---|
| P0 | **0** (بعد إزالة 2 false positive) |
| P1 | 4 |
| P2 | 2 |
| P3 | 3 |
| **الإجمالي** | **9 بنود فعلية** (لا 15) |

## 5. الإحصاءات البنيوية المرجعية

- `components/` 449 ملف · مجلدات موضوعية ناضجة (مثل `settings/` 40, `contracts/` 33).
- `hooks/` 315 ملف موزّعة على 6 طبقات (`data`, `domain`, `page`, `application`, `auth`, `ui`).
- `utils/` 160 ملف · 17 مجلد · 0 تبعية على `sonner`/`supabase`.
- `lib/` 93 ملف · 14 مجلد + `cn.ts`, `logger.ts`, `notify.ts` في الجذر.

---

**الحالة: قراءة فقط.** لا تعديلات على الكود ضمن هذا التقرير؛ يتطلب تنفيذ P1–P3 موافقة منفصلة.
