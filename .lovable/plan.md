## الهدف

توضيح فصل العقود المُرحّلة عن الجديدة، وفصل المتأخرات حسب السنة المالية، في **3 مواضع**: صفحة الحسابات الختامية، صفحة العقود (بطاقات + كشف)، وPDF الحسابات الختامية. مع اختبارات تكامل وحدود.

## 1) صفحة الحسابات الختامية — التوضيح + سطر إجمالي الدفعات

**`src/components/accounts/AccountsContractsTable.tsx`**
- استقبال prop جديد `fiscalYearStartDate: string | null`.
- إضافة عمود **النوع** (شارة `مُرحّل` / `جديد` / لا شيء عند `unknown`) قبل عمود "الحالة".
- ملء الخانة الفارغة في `TableFooter` تحت "عدد الدفعات" بـ **إجمالي الدفعات** = مجموع `getExpectedPayments` لكل العقود + ملصق `دفعة`.
- إضافة عداد سفلي تحت الإجمالي: `مُرحّل: X | جديد: Y` (يظهر فقط عند `fiscalYearStartDate !== null`).
- عرض الموبايل: شارة النوع داخل كل بطاقة + سطر "إجمالي الدفعات" في بطاقة الإجمالي.

**`src/hooks/page/admin/accounts/useAccountsPage.ts`** (أو الـ hook المرتبط بـ `AccountsPage`)
- استخراج `fiscalYear?.start_date ?? null` من `FiscalYearContext` وتمريره للجدول.

## 2) صفحة العقود — عرض تفصيلي للمتأخرات في البطاقات والكشف

**`src/components/contracts/CollectionSummaryCards.tsx`** — موجود جزئياً؛ التأكد من ظهور سطرَي "من سنوات سابقة" و"هذه السنة" بوضوح تحت بطاقة "المتأخر" مع لون `text-destructive` للمرحّل، وإخفاؤهما عند `fiscalYearStart === null`.

**`src/components/contracts/CollectionReport.tsx`** — إضافة قسم تفصيلي (لوحة صغيرة) تحت البطاقات يعرض:
- "متأخرات من سنوات سابقة: X ر.س (N فاتورة)"
- "متأخرات هذه السنة: Y ر.س (M فاتورة)"
- يظهر فقط عند `fiscalYearStart !== null`.

> هذا يتطلب توسيع `summarizeCollection` لإرجاع `overdueFromPreviousCount` و`overdueInYearCount` (يوجد `Amount` فقط — نُضيف `Count`).

## 3) PDF الحسابات الختامية — تقسيم المتأخرات

**`src/utils/pdf/entities/accountsPdf.ts`**
- توسيع `data` بـ:
  - `fiscalYearStartDate?: string | null`
  - `contracts[].start_date?: string` (اختياري)
  - `overdueFromPreviousAmount?: number`, `overdueInYearAmount?: number`
- جدول العقود: إضافة عمود **النوع** (`مُرحّل` / `جديد` / `—`) + صف `foot` ثانٍ:
  ```
  ['إجمالي الدفعات', N]
  ['مُرحّل / جديد', `X / Y`]
  ```
- **قسم جديد** "المتأخرات حسب السنة المالية" بين قسم المصروفات والتوزيع (يظهر فقط عند `fiscalYearStartDate !== null` وعند وجود أي مبلغ متأخر):
  ```
  من سنوات سابقة | -X
  هذه السنة      | -Y
  الإجمالي       | -(X+Y)
  ```

**`src/pages/dashboard/AccountsPage.tsx` / hook الطباعة**
- تمرير `fiscalYearStartDate` + `start_date` للعقود + قيم المتأخرات من `summarizeCollection` إلى `generateAccountsPDF`.

## 4) إخفاء الفلاتر في وضع "كل السنوات" — تأكيد

موجود بالفعل في `ContractsFiltersBar` (خياران مخفيان عند `fiscalYearStartDate === null`). نضيف **اختبار صريح** لضمان عدم التراجع.

## 5) الاختبارات

**a) وحدة — حدود التاريخ** `src/utils/financial/contractClassification.test.ts`
- إضافة:
  - تماماً يوم بداية السنة → `inYear`
  - يوم واحد قبل البداية → `fromPrevious`
  - استقرار: نفس المدخل عبر 100 استدعاء يُرجع نفس النتيجة (no randomness).

**b) تكامل** `src/test/contractsFiltersCollectionReport.integration.test.tsx` (جديد)
- يُحاكي `CollectionReport` داخل `FiscalYearContext` بقيمتين مختلفتين لـ `fiscalYearId`:
  1. تغيير `fiscalYearId` يحدّث الفلاتر والبطاقات فوراً.
  2. وضع `'all'` → بطاقتا "من سنوات سابقة / هذه السنة" مخفيتان + خيارا الفلتر مخفيان.
  3. تغيير `fiscalYearId` يُعيد تصنيف العقود ويظهر الفصل.

**c) وحدة موسعة** `src/hooks/page/admin/contracts/useContractsFilters.test.ts`
- إضافة حالة: عند `fiscalYearStartDate === null` ⇒ `statusCounts.contractsInYear === 0` و`contractsFromPrevious === 0` ولا يؤثر على نتائج الفلاتر الأخرى.

**d) PDF** `src/utils/pdf/entities/accountsPdf.test.ts` (إن لم يوجد، نُنشئه بـ snapshot لقائمة الصفوف فقط — لا نولّد PDF فعلي).

## ما لا يتغيّر

- لا تغييرات DB / RPC / RLS / ZATCA.
- لا تغييرات في صفحات المستفيد/المحاسب (نطاق منفصل لاحقاً).
- لا تغيير في منطق `classifyContractOrigin` أو `summarizeCollection` الحسابي — فقط **إضافة** حقول `Count` الجديدة.
- الملفات المحمية (`client.ts`, `types.ts`, `config.toml`, `.env`) لا تُلمس.

## الملفات المتأثرة

```
تعديل:
  src/components/accounts/AccountsContractsTable.tsx
  src/hooks/page/admin/accounts/useAccountsPage.ts  (أو ما يعادله)
  src/pages/dashboard/AccountsPage.tsx              (تمرير بسيط)
  src/components/contracts/CollectionSummaryCards.tsx
  src/components/contracts/CollectionReport.tsx
  src/utils/financial/collectionCompute.ts          (+ Count fields)
  src/utils/pdf/entities/accountsPdf.ts

تحديث اختبارات:
  src/utils/financial/contractClassification.test.ts
  src/hooks/page/admin/contracts/useContractsFilters.test.ts
  src/components/accounts/AccountsContractsTable.test.tsx

جديد:
  src/test/contractsFiltersCollectionReport.integration.test.tsx
  src/utils/pdf/entities/accountsPdf.test.ts  (snapshot صفوف فقط)
```

## معايير القبول

- في `/dashboard/accounts` يظهر عمود "النوع" + سطر "إجمالي الدفعات" في الجدول والموبايل.
- في `/dashboard/contracts` بطاقة "المتأخر" تُظهر سطرَي التقسيم + قسم تفصيلي في `CollectionReport`.
- PDF الحسابات الختامية يحوي عمود النوع + قسم "المتأخرات حسب السنة المالية".
- وضع "كل السنوات" يُخفي كل عناصر التصنيف (شارات/بطاقات/أقسام/فلاتر).
- جميع الاختبارات (وحدة + تكامل) خضراء.
