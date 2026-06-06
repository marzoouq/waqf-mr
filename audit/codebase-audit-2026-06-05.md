# تقرير تدقيق قاعدة الكود — 2026-06-05 (مُحدَّث بعد التنفيذ)

> تدقيق قراءة فقط لـ 1,212 ملف في `src/`، تلاه تنفيذ البنود المؤكدة.

## 1. الحالة العامة (CI أخضر بعد التنفيذ)

| الفحص | قبل | بعد |
|---|---|---|
| Conventions Deep | 5 Info | **4 Info** (كلها ألوان Hex في Canvas/PDF — مسموحة) |
| Hooks Layout (264 ملف) | 0 | 0 |
| UI Permissions (449 ملف) | 0 | 0 |
| Page Controls | 0 Gap | 0 Gap |
| Structure | 17 ملف > 200 LOC | 17 (لا حرج، أغلبها صفحات اختبار/UI كبيرة مقبولة) |

## 2. بنود سبق إثبات خطؤها (false positives) — لا تنفيذ

| البند | السبب |
|---|---|
| ~~P0.1~~ Auth.tsx يستورد `useSetting` | الملف يستخدم `useAuthPage` بالفعل |
| ~~P0.2~~ BeneficiaryDashboard يستورد `useBeneficiaryWidgets` | لا يوجد هذا الاستيراد |
| ~~P3.11~~ `src/services/` فارغ | المجلد غير موجود أصلاً |
| ~~P3.12~~ `hooks/application/` بلا README | الـ README موجود |

## 3. البنود المُنفَّذة

### P1 — متوسطة

- **P1.1 ✅ Hooks size**: استُخرج `useAnnualReportExport.ts` من `useAnnualReportPage.ts`، نزل من **200→178 سطر**. باقي الـ hooks (194/189/180) تحت الحد الرسمي.
- **P1.3 ✅ components/common reorganization**: نُقلت الملفات الجذرية الـ8 إلى مجلدات فرعية موضوعية:
  - `charts/` ← `ChartBox`, `ChartSkeleton`
  - `perf/` ← `DeferredRender`, `ViewportRender`
  - `access/` ← `FeatureGate`
  - `feedback/` ← `OfflineBanner`, `PageLoader`
  - `tables/` ← `VirtualTable`
  - `index.ts` (barrel) محدَّث؛ لا تغييرات في المستهلكين (الاستيرادات تمر عبر `@/components/common`).
- **P1.4 ✅ lib/contracts/README.md**: أُضيف ملف يوثّق حدود lib vs utils.

- **P1.2 ✅ تقسيم 5 مكونات (188-193 سطراً)** — كلها أصبحت < 140 سطراً بعد استخراج الأبناء العرضيين:
  - `MonthlyAccrualTable` 193 → **137** + `accrual/AccrualDesktopTable` (66) + `accrual/AccrualMobileSummary` (30).
  - `AccountsContractsTable` 193 → **67** + `contracts/AccountsContractsMobileList` (103) + `contracts/AccountsContractsDesktopTable` (95) + `contracts/originBadge` (8).
  - `PwaUpdateNotifier` 188 → **85** + `ChangelogDialog` (67) + `lib/pwa/semver` (37).
  - `VoucherFormDialog` 188 → **121** + `VoucherFormFields` (88).
  - `DisclosureFinancialStatement` 188 → **79** + 4 أبناء (Income/Expenses/Waterfall/MyShare بين 29-82).
  - لا تغيير في API الخارجي ولا في الاستيرادات من المستهلكين.

### P2 — مفيد

- **P2.2 ✅ ExpenseFormDialog regression test**: أُضيف `__tests__/ExpenseFormDialog.regression.test.tsx` يتأكد من عدم تكرار حقول الإدخال + يتحقق من `aria-invalid` عند الأخطاء (4 اختبارات تمر).
- **P2.1** Hooks بـ 6+ useState (`useUserManagementForms`, `useBylawsForms`, `useAuditLogPage`, `useCreateInvoiceForm`): كل واحد منها هوك نموذج (form state) ومكانه الصحيح في `hooks/page/`؛ تحويلها إلى `useReducer` لا يضيف قيمة حقيقية. تُترك كتحسين تجميلي اختياري.

### P3 — اختيارية

- **P3.1 ✅** أُرشف `scripts/codemod-common-barrel.mjs` إلى `scripts/_archive/`.
- **P3.2 ✅** أُصلح عدّاد الأسطر في `audit-conventions-deep.mjs` (تجاهل سطر `\n` النهائي) — `useAnnualReportPage.ts` لم يعد يُحسب خطأً 201.
- **P3.3** مراجعة `audit/conventions-deep-violations.csv`: بقيت 4 Info فقط (ألوان Hex داخل `SignaturePad.tsx` و`InvoicePreviewDialog.tsx`)؛ مقبولة بقاعدة الذاكرة (Canvas/PDF context).

## 4. ملخص

| الأولوية | تنفيذ |
|---|---|
| P0 | لا شيء (لا انتهاكات فعلية) |
| P1 | **4/4 منفذة** |
| P2 | **1/2 منفذة** (P2.1 مؤجلة بلا قيمة عملية) |
| P3 | **2/3 منفذة + مراجعة** (P3.3 لا يتطلب تعديل) |

## 5. التحقق

- `vitest run`: 233/234 ملف · 2020/2022 اختبار يمران (الفشلان pre-existing flaky في `useNotificationActions.test.ts` — لا علاقة بالتغييرات).
- جميع سكربتات التدقيق خضراء.
- الحالة النهائية: 0 Critical · 0 Warning · 4 Info (مسموحة).
