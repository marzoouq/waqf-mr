

# خطة إصلاح مشاكل العرض في صفحة العقود والفواتير

## المشاكل المكتشفة

### 1. صفحة العقود — `ContractsPage.tsx`
- **التبويبات (Tabs)** لا تحتوي على pagination في تبويب `PaymentInvoicesTab` عندما يكون عدد الفواتير أقل من `ITEMS_PER_PAGE` — الـ pagination مخفي بشرط `filtered.length > ITEMS_PER_PAGE` بدلاً من وضعه داخل Card مثل باقي الصفحات
- **عمود التحصيل في الموبايل** — يعرض `Progress` بدون عرض محدد (`w-` class) مما قد يتسبب في تمدد غير متوقع
- **تبويب فواتير الدفعات** — الـ `TablePagination` خارج الـ `Card` مما يكسر التناسق البصري مع باقي الجداول

### 2. صفحة الفواتير — `InvoicesPage.tsx`
- **عدم تعطيل زر الحذف والتعديل في Grid View** — عندما تكون السنة المقفلة (`isClosed`)، الـ `InvoiceGridView` لا يمرر `readOnly={isClosed}` بل يمرر `readOnly` بدون ربطه بـ `isClosed`
- **Grid View** لا يحتوي على pagination — عند عرض الفواتير في العرض الشبكي لا يوجد ترقيم صفحات

### 3. `PaymentInvoicesTab.tsx`
- **Pagination خارج Card** — موجود خارج الـ Card component مما يكسر التصميم الموحد

### 4. `InvoiceGridView.tsx`
- **لا يدعم `readOnly` فعلياً** — الكارتات لا تزال clickable حتى لو كانت `readOnly=false` (المشكلة في المنطق: `!readOnly && onEdit?.(inv)` صحيحة لكن الكارت لا يزال يظهر `cursor-pointer`)

## التغييرات المطلوبة

### 1. إصلاح InvoicesPage — تمرير `isClosed` إلى GridView
- في `InvoicesPage.tsx` سطر 327: تمرير `readOnly={isClosed}`

### 2. إصلاح InvoiceGridView — إضافة pagination وإصلاح cursor
- إضافة props لـ pagination (currentPage, itemsPerPage, onPageChange)
- إزالة `cursor-pointer` عند `readOnly`
- إضافة `TablePagination` أسفل الشبكة

### 3. إصلاح PaymentInvoicesTab — نقل Pagination داخل Card
- نقل `TablePagination` داخل `CardContent` لتتوافق بصرياً مع باقي الجداول
- إزالة الشرط `filtered.length > ITEMS_PER_PAGE` ليظهر Pagination دائماً (كباقي الصفحات)

### 4. إصلاح عرض التحصيل في الموبايل بـ ContractsPage
- إضافة `w-full` للـ Progress في بطاقات الموبايل

### ملخص الملفات المتأثرة
1. `src/pages/dashboard/InvoicesPage.tsx` — تمرير `readOnly={isClosed}`
2. `src/components/invoices/InvoiceGridView.tsx` — إضافة pagination + إصلاح cursor
3. `src/components/contracts/PaymentInvoicesTab.tsx` — نقل pagination داخل Card
4. `src/pages/dashboard/ContractsPage.tsx` — تحسين عرض الموبايل

