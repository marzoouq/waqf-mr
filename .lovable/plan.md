# تقرير مراجعة شاملة للبنية (Read-Only Audit)

## ملخص تنفيذي

**الحالة العامة: ممتازة.** المعمارية نظيفة، مُلتزمة بقواعد المشروع المعتمدة في الذاكرة، ومحمية بحواجز ESLint صارمة. لا توجد انتهاكات حرجة. التحسينات المقترحة كلها من فئة "صقل" وليست "إصلاح".

### مؤشرات الصحة

| المعيار | النتيجة |
|---|---|
| `console.log/error/warn` في الإنتاج | **0** ✅ |
| ألوان hex مباشرة في components/pages | **0** ✅ |
| `any` صريح | **0** ✅ |
| `TODO/FIXME/HACK` | **0** ✅ |
| `supabase.from` خام في pages/components | **0** ✅ (محمي بـ ESLint) |
| `supabase.auth` خام في pages/components | **0** ✅ (محمي بـ ESLint) |
| `useQuery`/`useMutation` في components | **0** ✅ |
| `toast` في hooks/data (إنتاج) | **0** ✅ |
| Barrel-from-barrel | **0** ✅ |
| ملفات > 300 سطر | **1** (auto-generated `types.ts` فقط) |
| Page Hook Pattern | مُطبَّق على كل الصفحات ✅ |
| طبقات hooks مفصولة | data(95) / page(103) / domain(15) / application(15) / ui(18) / auth(22) ✅ |

---

## المشاكل والفُرص (مرتّبة من الأكثر تأثيراً)

### 1. مركزة `queryKeys` — أهم تحسين متبقٍّ ⚠️

**المشهد**: 135 موضع `queryKey: [...]` موزّع على 62 ملفاً في `hooks/data/`. الملف الوحيد المركزي هو `lib/queryKeys/dashboardKeys.ts`.

**المخاطر**:
- خطر "drift" بين ملف يُخزّن المفتاح وملف يُلغي صلاحيته (`invalidateQueries`).
- ملاحظة فعلية: `usePaymentInvoices.ts` يُلغي 6 مفاتيح مختلفة، أي خطأ كتابي واحد يكسر التزامن.
- لا يوجد type-safety يضمن تطابق الأشكال.

**التوصية**: إنشاء `lib/queryKeys/<feature>.ts` لكل مجال (invoices, contracts, advances, messaging, support, zatca, accounts…) على نمط `dashboardKeys`، واستيرادها من `hooks/data` بدل التضمين الحرفي.

### 2. مكونات 180–186 سطر — تتجاوز سقف 180 ⚠️

سبع ملفات تتجاوز معيار المكون التقديمي:

```text
186  src/components/invoices/InvoiceGridView.tsx
186  src/components/beneficiary/my-share/AdvanceRequestDialog.tsx  (9 useState!)
185  src/components/reports/ZakatEstimationReport.tsx
182  src/components/settings/zatca/ZatcaFormCards.tsx
182  src/components/accounts/DistributeDialog.tsx                  (8 useState)
181  src/components/invoices/CreateInvoiceFromTemplate.tsx
181  src/components/accounts/AccountsSummaryCards.tsx
```

**ملاحظة خاصة**: `AdvanceRequestDialog` و `DistributeDialog` يحتويان منطقاً ثقيلاً (9 و 8 `useState`) — مرشحان لاستخراج page hook خاص بهما.

### 3. تنظيم `hooks/page/admin/financial/` — مجلد مسطّح يحتاج تقسيماً 🟡

27 ملفاً في مجلد واحد بدون مجلدات فرعية، بينما `hooks/data/financial/` مقسّم إلى 8 مجلدات موضوعية (accounts, advances, contracts, distribution, expenses, fiscalYears, income, dashboard).

**التوصية**: تطبيق نفس النمط على `hooks/page/admin/financial/`:
```text
hooks/page/admin/financial/
  ├── accounts/      (useAccountsPage, useAccountsExports, useAccountsExtras)
  ├── invoices/      (useInvoicesPage, useInvoicesFilters, useInvoiceFormState, useInvoiceSubmit, …)
  ├── expenses/      (useExpensesPage, useVoucherActions)
  ├── income/        (useIncomePage, useCollectionData)
  ├── distributions/ (useDistributionsPage)
  └── fiscalYears/   (useFiscalYearManagement)
```

### 4. ملفات PDF الكبيرة في `utils/pdf/` 🟡

```text
274  utils/pdf/reports/aggregatedAnnualReport.ts
195  utils/pdf/entities/accountsPdf.ts
184  utils/pdf/entities/beneficiary.ts
169  utils/pdf/entities/entities.ts
168  utils/pdf/reports/comparison.ts
163  utils/pdf/reports/forensicAudit.ts
152  utils/pdf/reports/annualDisclosurePdf.ts
```

PDF بطبيعتها طويلة، لكن `aggregatedAnnualReport.ts` (274) يستحق تقسيماً إلى أقسام (header, sections, footer, totals) لتسهيل الصيانة.

### 5. `utils/financial/collection/collectionCompute.ts` (199 سطر) 🟡

أكبر ملف في `utils/financial/`. يحتمل تقسيماً وفق المسؤوليات الفرعية (filtering, aggregation, formatting).

### 6. مراجعة الحدود بين `hooks/application/` و `hooks/page/` 🟡

`hooks/application/` معرّف بأنه "feature controllers عابرة للأدوار". لكن بعض الملفات الحالية تبدو خاصة بصفحة بعينها:
- `useAuthPage.ts` — مُستهلَك من `/auth` صفحة واحدة → يبدو `page/` بطبيعته.
- `useLayoutShell.ts` — يخدم layout root، مكانه الحالي مقبول لكنه على الحد.
- `useLandingPage.ts` — صفحة واحدة → `page/` أنسب.
- `useInstallAppPage.ts` — صفحة واحدة → `page/` أنسب.

**التوصية**: مراجعة كل ملف في `application/` والتأكد أنه فعلاً عابر للأدوار/الصفحات. ما هو خاص بصفحة ينقل إلى `hooks/page/`.

### 7. تكرار اسم `types.ts` (3 ملفات في productioncode) — تجميل اختياري 🟢

```text
src/components/accounts/collection/types.ts
src/hooks/data/dashboard/types.ts
src/lib/diagnostics/types.ts
```

النطاقات منفصلة بمسارها، فلا يوجد لبس فعلي. تجميل اختياري: تسمية مميزة (`collectionTypes.ts`, `dashboardDataTypes.ts`) لتسهيل البحث.

### 8. `lib/services/` بحاجة مراجعة لاستخراج المشترك 🟢

21 ملفاً، أكبرها:
- `diagnosticsReadService.ts` (222)
- `fiscalYearService.ts` (196)

`diagnostics*` خاص: لديه 4 ملفات (`diagnosticsService`, `diagnosticsReadService`, مع 4 ملفات في `lib/diagnostics/checks/`). يُنصح بفحص هل يمكن دمج الاثنين أو فصل واضح للقراءة عن الكتابة.

### 9. `routes/` يحتوي على `ProtectedRouteHelper.tsx` و `withRouteErrorBoundary.tsx` 🟢

تنظيم جيد. اختياري: نقل الأدوار-routes إلى `app/routes/` لتركيز كل ما يخص bootstrap في مكان واحد. الترتيب الحالي مقبول.

---

## خطة التنفيذ الموصى بها (مرتّبة حسب الأثر)

> **ملاحظة**: لا توجد بنود حرجة. كل البنود تحسينات تدريجية يمكن إجراؤها بأي ترتيب.

### المرحلة 1 — تحسينات مرتفعة الأثر

1. **مركزة `queryKeys` لكل مجال**
   إنشاء `lib/queryKeys/{invoices,contracts,advances,messaging,support,zatca,accounts,expenses,income,fiscalYear,distributions}.ts` على نمط `dashboardKeys.ts`، ثم refactor تدريجي لـ `hooks/data/` لاستخدامها. أكبر فائدة في `usePaymentInvoices.ts` الذي يُلغي 6 مفاتيح.

2. **تجزئة المكوّنين الأكثر تعقيداً**
   - `AdvanceRequestDialog.tsx` (9 useState) → استخراج `useAdvanceRequestDialog` في `hooks/page/beneficiary/`.
   - `DistributeDialog.tsx` (8 useState) → استخراج `useDistributeDialog` في `hooks/page/admin/financial/`.

### المرحلة 2 — تنظيمية

3. **تقسيم `hooks/page/admin/financial/` إلى مجلدات موضوعية** (مطابقة لبنية `hooks/data/financial/`).
4. **مراجعة `hooks/application/`** ونقل ما هو خاص بصفحة إلى `hooks/page/` (مرشحان واضحان: `useAuthPage`, `useLandingPage`, `useInstallAppPage`).
5. **تقسيم 5 مكونات تقديمية > 180 سطر** (InvoiceGridView, ZakatEstimationReport, ZatcaFormCards, CreateInvoiceFromTemplate, AccountsSummaryCards).

### المرحلة 3 — اختيارية (صقل)

6. **تقسيم `utils/pdf/reports/aggregatedAnnualReport.ts` (274)** إلى أقسام.
7. **تقسيم `utils/financial/collection/collectionCompute.ts` (199)** بحسب المسؤوليات.
8. **مراجعة `lib/services/diagnostics*`** للحدّ من التداخل.
9. **توحيد تسمية `types.ts` المكررة** بأسماء موضوعية مميزة.

---

## نقاط القوة الجديرة بالحفاظ عليها

- **حواجز ESLint قوية**: `no-restricted-syntax` يمنع supabase خام وألوان hex في pages/components — استمر في توسيع القائمة عند ظهور أنماط جديدة يجب منعها.
- **Page Hook Pattern مُطبَّق 100%**: كل الصفحات < 200 سطر و 0 useQuery داخلها.
- **طبقات hooks منفصلة بشكل نموذجي**: `data` (Supabase) → `domain` (computations) → `page` (orchestration) → `ui` (presentational helpers).
- **lib/services يفصل I/O عن hooks** بشكل صحيح، وغالبية hooks/data تستدعي services بدلاً من supabase مباشرة.
- **`utils/` نقي**: 0 استيراد من hooks/components، 0 toast، 0 supabase.
- **اختبارات مُتعايشة** مع الكود (Vitest co-located) مع `src/test/` للتكامل.

---

## ما لن يُغيَّر

- **ملفات auto-generated**: `types.ts` (2610 سطر) — مُولَّد من Supabase، لا يُلمس.
- **ملفات auth الحساسة**: `AuthContext.tsx`, `ProtectedRoute*`, `FiscalYearContext.tsx` — استخدام supabase داخل `AuthContext` مقصود (هو القناة الوحيدة المسموح بها).
- **`contracts_safe` view و pre-auth RPCs**: موثّقة في `@security-memory`.

---

## التوصية النهائية

البنية في وضع نموذجي. **لا توجد إصلاحات عاجلة مطلوبة**. ابدأ بالمرحلة 1 (queryKeys + المكوّنين المعقّدين) لأنها أعلى عائد لأقل جهد. باقي المراحل يمكن أن تتم تدريجياً كجزء من المهام المستقبلية في تلك المجالات.
