# خطة نهائية موحّدة — فصل العقود والمتأخرات حسب السنة المالية

## قاموس موحّد (يُلتزم به في كل الطبقات)

محور زمني واحد بكلمتَي مفتاح متناظرتَين: `inYear` (داخل السنة) / `fromPrevious` (من قبلها).

| المفهوم | مفتاح برمجي | تسمية عربية في الواجهة |
|---|---|---|
| عقد بدأ داخل السنة الحالية | `contractsInYear` | عقود جديدة في السنة |
| عقد بدأ قبل السنة الحالية وما زال يظهر فيها | `contractsFromPrevious` | عقود مستمرة من سنة سابقة |
| فاتورة استحقاقها داخل السنة الحالية وغير مدفوعة | `overdueInYear` | متأخرات هذه السنة |
| فاتورة استحقاقها قبل السنة الحالية وغير مدفوعة | `overdueFromPrevious` | متأخرات من سنوات سابقة |

تعريف رياضي:

```text
contractsFromPrevious  ⇔ contract.start_date < fiscalYear.start_date
contractsInYear        ⇔ contract.start_date ≥ fiscalYear.start_date
overdueFromPrevious    ⇔ invoice.due_date    < fiscalYear.start_date AND status ≠ 'paid'
overdueInYear          ⇔ invoice.due_date    ≥ fiscalYear.start_date AND invoice.due_date ≤ today AND status ≠ 'paid'
```

في وضع `'all'` (`isSpecificYear === false`): التصنيف غير معرَّف ⇒ تُخفى الفلاتر الجديدة ويُخفى السطر الفرعي في بطاقة المتأخر.

---

## نتائج التحقق الجنائي (مثبّتة بالكود)

1. `FiscalYearContext` يوفّر `fiscalYear` كاملاً مع `start_date` — لا حاجة لـ `fiscalYears.find()`.
2. `useContractsByFiscalYear` يفلتر بـ `eq('fiscal_year_id', …)`. عمود `contracts.start_date` يبقى أصلياً بعد أي تجديد، لذا التصنيف يعمل داخل النتيجة المُجلَبة.
3. `paymentInvoices.due_date` متاح لكل دفعة ⇒ تصنيف المتأخرات يعتمد على الفاتورة لا العقد.

---

## التغييرات (7 ملفات فقط)

### 1) `src/utils/financial/contractClassification.ts` — جديد (≤25 سطر)

```ts
export type ContractOriginClass = 'inYear' | 'fromPrevious' | 'unknown';

export function classifyContractOrigin(
  contractStartDate: string,
  fiscalYearStartDate: string | null,
): ContractOriginClass {
  if (!fiscalYearStartDate) return 'unknown';
  return contractStartDate < fiscalYearStartDate ? 'fromPrevious' : 'inYear';
}
```

+ `contractClassification.test.ts` بثلاث حالات.

### 2) `src/hooks/page/admin/contracts/useContractsFilters.ts`

- توسيع `StatusFilterValue` بقيمتين: `'contractsInYear'`, `'contractsFromPrevious'`.
- استقبال `fiscalYearStartDate: string | null` كمعامل.
- إضافة عدّادَين في `statusCounts`: `contractsInYear`, `contractsFromPrevious` (يُحتسبان فقط عند توفّر `fiscalYearStartDate`).
- منطق الفلترة يستدعي `classifyContractOrigin`.

### 3) `src/hooks/page/admin/contracts/useContractsFilters.test.ts`

- ثلاث حالات: عقد ضمن السنة، عقد مستمر، وضع كل السنوات.

### 4) `src/components/contracts/ContractsFiltersBar.tsx`

- توسيع `StatusCounts` بحقلَي العدّادَين الجديدَين.
- إضافة قسم في القائمة بفاصل `─── حسب السنة المالية ───`:
  - «عقود جديدة في السنة (N)» → `contractsInYear`
  - «عقود مستمرة من سنة سابقة (N)» → `contractsFromPrevious`
- إخفاء القسم بالكامل عند `fiscalYearStartDate === null`.

### 5) `src/hooks/page/admin/contracts/useContractsPage.ts`

- استدعاء `useFiscalYear()` واستخراج `fiscalYear?.start_date ?? null`.
- تمرير القيمة إلى `useContractsFilters` وإلى `ContractsFiltersBar`.

### 6) `src/utils/financial/collectionCompute.ts`

- توسيع `summarizeCollection(rows, invoices, fiscalYearStart)` بأربعة حقول:
  - `overdueInYearAmount`
  - `overdueInYearCount`
  - `overdueFromPreviousAmount`
  - `overdueFromPreviousCount`
- التصنيف يعتمد على `invoice.due_date` مقارنةً بـ `fiscalYearStart`.
- عند `fiscalYearStart === null` تُترك الحقول الأربعة `0` ولا يتم عرض السطر الفرعي.

### 7) `src/hooks/page/admin/financial/useCollectionData.ts`

- تمرير `fiscalYear?.start_date ?? null` إلى `summarizeCollection`.

### 8) `src/components/contracts/CollectionSummaryCards.tsx`

- بطاقة «المتأخر» تبقى كما هي.
- إضافة سطر فرعي صغير تحتها (يظهر فقط عند `fiscalYearStart !== null` ووجود قيمة موجبة):
  - «من سنوات سابقة: X ر.س»
  - «هذه السنة: Y ر.س»

(الترقيم 7 ملفات + ملف الاختبار للدالة النقية = 8 إجمالاً.)

---

## ما لن يتغير

- لا تعديلات قاعدة بيانات / RLS / RPC / ZATCA.
- لا تعديل في توزيع الريع أو احتساب الإيراد أو شاشات المستفيد/الواقف.
- لا `DashboardAlerts` ولا `OverdueTenantsReport` ولا بطاقة جديدة في لوحة الناظر.
- لا ذاكرة جديدة (`mem://`) في هذه الموجة — تُضاف بعد تثبيت التنفيذ.

---

## سيناريوهات التحقق

| # | السيناريو | الفلتر | المتأخر |
|---|---|---|---|
| 1 | عقد بدأ بعد بداية السنة، منتظم | `contractsInYear` | لا يظهر |
| 2 | عقد بدأ قبل بداية السنة، منتظم | `contractsFromPrevious` | لا يظهر |
| 3 | عقد بدأ قبل السنة وعليه فاتورة قديمة غير مدفوعة | `contractsFromPrevious` | داخل «من سنوات سابقة» |
| 4 | عقد جديد وعليه فاتورة حالية متأخرة | `contractsInYear` | داخل «هذه السنة» |
| 5 | وضع «كل السنوات» | الفلاتر مخفية | السطر الفرعي مخفي |

---

## مصفوفة الاتساق (للمراجعة قبل الموافقة)

```text
المفتاح البرمجي       ↔ الواجهة العربية                ↔ مصدر التصنيف
contractsInYear        ↔ عقود جديدة في السنة            ↔ contracts.start_date
contractsFromPrevious  ↔ عقود مستمرة من سنة سابقة       ↔ contracts.start_date
overdueInYear          ↔ متأخرات هذه السنة              ↔ payment_invoices.due_date
overdueFromPrevious    ↔ متأخرات من سنوات سابقة         ↔ payment_invoices.due_date
```

نفس الجذرين (`InYear` / `FromPrevious`) عبر العقود والمتأخرات — لا تذبذب، لا تعارض مع «رقبة الوقف المرحّلة» أو `advance_carryforward` أو إقفال السنة.