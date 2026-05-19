## السياق

بعد فحص صارم للمكونات الأربعة (لوحة الناظر/المستفيد × فواتير/مصروفات) ظهر تناقضان:

| الصفحة | يقرأ من | ملاحظة |
|--------|---------|--------|
| `/dashboard/invoices` (الناظر) | `invoices` فقط | **لا يرى فواتير الإيجار** |
| `/beneficiary/invoices` (المستفيد) | `invoices` + `payment_invoices` | يرى الاثنين بتبويبات (الكل/إيجار/شراء) |
| `/dashboard/expenses` (الناظر) | `expenses` + إضافة/تعديل/حذف | الأزرار فعّالة |
| `/beneficiary/expenses` (المستفيد) | `expenses` للقراءة فقط | أزرار Edit/Trash **مرئية معطّلة** بدل إخفائها |

**التناقض الأول (فواتير):** الناظر يرى عدداً أقل من المستفيد في نفس السنة المالية — لأن `payment_invoices` (فواتير الإيجار التي يولّدها نظام العقود تلقائياً) غير مدمجة في لوحته. عملياً الناظر يستطيع إصدار فاتورة من قالب (`invoices`)، لكنه لا يرى/يدير فواتير الإيجار المُولَّدة، فيشعر أن "لوحة الفواتير = لوحة المصروفات".

**التناقض الثاني (مصروفات المستفيد):** المكوّن المشترك `ExpensesDesktopTable/ExpensesMobileCards` يطبّق `disabled={isLocked}` على زرّي Edit/Trash، فيظهران رماديّين بلا فائدة.

---

## الخطة

### 1) إخفاء أزرار Edit/Trash للمستفيد بدل تعطيلها

تعديل المكوّنين المشتركين لإضافة prop جديد `readOnly` (افتراضياً `false`) — عندما يكون `true` تُحذف خلية/كتلة الإجراءات بالكامل من DOM.

- `src/components/expenses/ExpensesDesktopTable.tsx` — رأس "الإجراءات" + `<TableCell>` للأزرار يُلفّان بـ `{!readOnly && (...)}`.
- `src/components/expenses/ExpensesMobileCards.tsx` — `<div className="flex gap-1 shrink-0">` يُلفّ بـ `{!readOnly && (...)}`.
- `src/pages/beneficiary/ExpensesViewPage.tsx` — تمرير `readOnly={true}` (يبقى `isLocked` كما هو لمنع التعديل من شاشات أخرى).
- لوحة الناظر تبقى دون تغيير: `readOnly` غير مُمرَّر → الأزرار تظهر كما هي (مع `disabled` للسنوات المُقفلة).

### 2) توحيد لوحة فواتير الناظر مع فواتير الإيجار

دمج `payment_invoices` في `/dashboard/invoices` بنفس فلسفة لوحة المستفيد، مع الإبقاء على صلاحيات الإنشاء/التعديل/الحذف لمصدر `expense` فقط:

**أ. نقل النوع المشترك:**
- نقل `UnifiedInvoiceItem` + `InvoiceSourceFilter` من `useInvoicesViewPage.ts` إلى `src/types/invoices.ts`.
- استيرادهما في كلا الهوكين.

**ب. توسيع `useInvoicesPage`:**
- إضافة `usePaymentInvoices(fiscalYearId)` بجانب `useInvoicesByFiscalYear`.
- بناء `unifiedInvoices: UnifiedInvoiceItem[]` (دمج + ترتيب تنازلي حسب التاريخ).
- إضافة state `sourceFilter: InvoiceSourceFilter` (افتراضي `'all'`).
- تحديث `useInvoicesFilters` لقبول الـ unified list + `sourceFilter`؛ فلتر `filterType` يُطبَّق فقط على `source==='expense'`.
- `invoicesWithoutFiles` يفحص كلا المصدرين.
- `handleGeneratePdfForMissing` يستدعي Edge Function `generate-invoice-pdf` مع `sourceTable` المناسب لكل صف (الـ Edge Function تدعمهما أصلاً).
- `handleConfirmDelete` و `handleEdit` يعملان فقط لـ `source==='expense'` (تأكيد بالـ guard).

**ج. تحديث صفحة `InvoicesPage.tsx`:**
- إضافة شريط تبويبات (الكل/إيجار/شراء) فوق فلاتر النوع/الحالة (نفس الـ Tabs من صفحة المستفيد).
- `InvoiceSummaryCards` يبقى لمصدر `expense` فقط (لتفادي خلط VAT/الإجماليات).
- في الجدول والشبكة: شارة `source` (إيجار/شراء) بجانب رقم الفاتورة، وعرض `payment_number/payment_count` للإيجار بصيغة "العقد X — الدفعة n/m" بدلاً من تكرار الاسم.
- أزرار Edit/Delete/Upload تُخفى للصفوف ذات `source==='rent'` (تُعرض فقط: عرض الملف + توليد PDF + معاينة).
- زرّ "إنشاء من قالب" يبقى كما هو (يُنشئ فقط `invoices` — فواتير الإيجار تُولَّد تلقائياً من العقود).

**د. تحديث المكوّنات المشتركة:**
- `InvoicesDesktopTable`, `InvoiceGridView`, `MobileCardView` items: قبول `UnifiedInvoiceItem` مع `source` و conditional rendering لأزرار الكتابة.

### 3) اختبارات

- `useInvoicesPage.test.ts`: التحقق من أن `sourceFilter='all'` يدمج المصدرين، وأن `handleEdit/handleConfirmDelete` يُتجاهلان لصف `rent`، وأن `invoicesWithoutFiles` يشمل المصدرين.
- `ExpensesViewPage.test.tsx`: تأكيد أن `readOnly=true` يُخفي كل أزرار Edit/Trash من DOM (وليس `disabled` فقط).
- مقارنة بيانات: نفس `fiscal_year_id` → نفس عدد الفواتير في لوحة الناظر ولوحة المستفيد.

### 4) توثيق الذاكرة

تحديث الذاكرة:
- `mem://business-logic/finance/invoices-page-unified-source` — قاعدة جديدة: لوحة الفواتير لكلا الدورين تقرأ `invoices` + `payment_invoices` معاً، والكتابة محصورة بمصدر `expense`.
- إضافة ملاحظة في `mem://business-logic/finance/beneficiary-expenses-view-parity` بأن أزرار الإجراءات تُخفى عبر `readOnly` لا `disabled`.

---

## معايير القبول

1. صفحة `/beneficiary/expenses`: لا يوجد أي زر تعديل/حذف في DOM (`document.querySelector('[aria-label="تعديل"]')` يعطي null).
2. صفحة `/dashboard/invoices` في نفس السنة المالية تعرض **نفس** إجمالي الفواتير الذي تعرضه `/beneficiary/invoices` (مجموع `invoices` + `payment_invoices`).
3. الناظر يستطيع: إنشاء من قالب، تعديل، حذف، رفع ملف، توليد PDF — للمصدر `expense` فقط.
4. الناظر يستطيع: عرض ملف، معاينة، توليد PDF — للمصدر `rent`. أزرار التعديل/الحذف غير موجودة في DOM لصفوف `rent`.
5. سنة مالية مُقفلة: سلوك الناظر كما كان (`disabled` على أزرار الكتابة لمصدر `expense`).
6. `bun run check:conventions` و `bunx vitest run` بدون أخطاء جديدة.
