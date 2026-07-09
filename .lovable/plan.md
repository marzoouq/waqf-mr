
## المشكلة

صفحة **"المصروفات التشغيلية"** في لوحة الناظر (`/dashboard/expenses`) لا تسمح بإرفاق فواتير عند إضافة/تعديل المصروف. المطلوب:

1. الناظر يستطيع إرفاق **ملف واحد أو أكثر** لكل مصروف (إنشاء + تعديل).
2. المرفقات تظهر للمستفيد في صفحة "مصروفات الوقف".
3. المستفيد يستطيع **فتح وتنزيل** كل مرفق.

## نتيجة التحقق المسبق (بدون تعارض)

- `invoices.expense_id` (nullable + FK) موجود — يدعم علاقة **مصروف واحد → عدة فواتير**.
- `ExpenseAttachments` (لوحة المستفيد) **يعرض مسبقاً قائمة كل** الفواتير المرتبطة بالمصروف، وكل زر يفتح `InvoiceViewer` عبر `getInvoiceSignedUrl` (روابط موقّعة TTL=5د).
- سياسة `storage.objects` لـ bucket `invoices` تمنح المستفيد قراءة الفواتير المرتبطة بسنة منشورة (مضافة سابقاً).
- `uploadInvoiceFile`, `useInvoiceFileUpload`, `createInvoice`, `deleteInvoice`, `computeDocumentationStats` جاهزون للاستخدام.
- Realtime على `invoices` مفعّل — ظهور فوري لدى المستفيد.
- قيم `invoice_type` المدعومة: `utilities | maintenance | rent | other` فقط (`purchase` هو فلتر UI). سنشتق النوع من `expense_type`.

## الحل

### رفع متعدد داخل نموذج المصروف

- خطاف جديد `useMultipleFilesUpload` يدير `File[]` + drag/drop + previews + add/remove/reset، يستفيد من `validateFileSignature`/MIME/size من `useInvoiceFileUtils`.
- UI: dropzone + `input[multiple]` + قائمة الملفات المختارة مع زر حذف لكل واحد + معاينة للصور.
- حد أعلى: **10 ملفات لكل مصروف**.

### دورة الحفظ

1. إنشاء/تحديث `expenses` كالمعتاد.
2. لكل ملف: `uploadInvoiceFile` → `createInvoice({ expense_id, invoice_type: mapExpenseTypeToInvoiceType(expense_type), amount, date, property_id, fiscal_year_id, status: 'paid', file_path, file_name, description, vat_rate: 0, vat_amount: 0 })`.
3. `Promise.allSettled` — لا يوقف البقية إن فشل واحد؛ toast تحذيري بعدد الفاشل.
4. `resetFiles()` بعد الإرسال.

### التعديل

- عرض قائمة المرفقات الحالية (من `useInvoices` filtered by `expense_id`) مع زر حذف يستدعي `useDeleteInvoice` (يحذف DB + Storage).
- الملفات الجديدة تُضاف بجانب الحالية.

## الملفات المتأثرة

1. **`src/utils/financial/expenses/expenseInvoiceTypeMap.ts`** (جديد) — خريطة `expense_type` → `invoice_type`.
2. **`src/hooks/ui/useMultipleFilesUpload.ts`** (جديد) — إدارة `File[]` + validation + previews.
3. **`src/components/expenses/ExpenseFormDialog.tsx`** — قسم مرفقات (dropzone + قائمة + معاينة صور) + قسم مرفقات حالية عند التعديل مع زر حذف.
4. **`src/hooks/page/admin/financial/useExpensesPage.ts`** — إدماج `useMultipleFilesUpload`, `createInvoice`, `deleteInvoice`، وتمرير مرفقات المصروف قيد التعديل.
5. **`src/hooks/page/admin/financial/useExpensesMutations.ts`** — رفع الملفات وربطها بعد إنشاء/تحديث المصروف عبر `Promise.allSettled` + toast موحّد.
6. **`src/pages/dashboard/ExpensesPage.tsx`** — تحديث النص التوضيحي.
7. **اختبارات**: `useMultipleFilesUpload.test.ts`, `expenseInvoiceTypeMap.test.ts`, تحديث `useExpensesPage.test.ts` بسيناريو مصروف بثلاثة ملفات.

## لوحة المستفيد

**بدون تغييرات كود**. `ExpenseAttachments` يعرض قائمة المرفقات تلقائياً بأي عدد، و `InvoiceViewer` يفتح/يُنزّل كل واحد عبر رابط موقّع.

## التحقق النهائي

1. `tsgo --noEmit` نظيف.
2. `vitest run` — الاختبارات الجديدة خضراء + `useExpensesPage`, `documentationRate`, `beneficiaryExpensesView` لا تنكسر.
3. Playwright يدوي:
   - ناظر: مصروف بـ 3 ملفات (PDF + JPG + PNG) → عمود المرفقات يظهر 3.
   - مستفيد (سنة منشورة): توسيع الصف يعرض 3 ملفات؛ تنزيل كل واحد يعمل.

## لا تعارض / لا تكرار

- لا Migration، لا تغيير RLS، لا مساس بصفحة الفواتير الضريبية أو ملفات المصادقة.
- إعادة استخدام كامل: `uploadInvoiceFile`, `createInvoice`, `deleteInvoice`, `ExpenseAttachments`, `InvoiceViewer`, `getInvoiceSignedUrl`, `computeDocumentationStats`.
