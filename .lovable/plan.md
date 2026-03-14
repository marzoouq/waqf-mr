

# تحسين صفحة العقود — فلتر الحالة + تحسين الفواتير والتحصيل

## 1. فلتر حالة العقود (نشط/منتهي/الكل)

إضافة `Select` بجانب شريط البحث في تبويب العقود لفلترة المجموعات حسب حالة أحدث عقد.

**الملف:** `src/pages/dashboard/ContractsPage.tsx`
- إضافة state: `statusFilter: 'all' | 'active' | 'expired'`
- تطبيق الفلتر على `filteredGroups` بحيث يفحص حالة أحدث عقد في المجموعة
- عرض العدد بجانب كل خيار

## 2. تحسين صفحة فواتير الدفعات (`PaymentInvoicesTab`)

التحسينات:
- **تجميع الفواتير حسب العقد** بدلاً من قائمة مسطحة — عرض اسم العقد والمستأجر كعنوان، تحته فواتيره
- **إضافة pagination للموبايل** (حالياً الـ mobile cards تعرض `paginated` لكن بدون تنظيم)
- **ألوان أوضح للبطاقات** على الموبايل حسب الحالة
- **زر "إلغاء التسديد"** مفقود من عرض الموبايل — إضافته

**الملف:** `src/components/contracts/PaymentInvoicesTab.tsx`

## 3. تحسين تقرير التحصيل (`CollectionReport`)

التحسينات:
- **إضافة TablePagination** — حالياً يعرض كل الصفوف بدون ترقيم
- **إضافة ExportMenu** لتصدير PDF (الدالة `generateCollectionReportPDF` موجودة بالفعل في الـ props أو يمكن ربطها)
- **إضافة شريط ملخص أسفل الجدول** يعرض المجاميع
- **تحسين عرض الموبايل** — إضافة ترتيب أفضل للبطاقات مع Progress bar أوضح

**الملف:** `src/components/contracts/CollectionReport.tsx`

## الملفات المتأثرة

```text
src/pages/dashboard/ContractsPage.tsx              ← فلتر الحالة
src/components/contracts/PaymentInvoicesTab.tsx     ← تجميع + تحسينات
src/components/contracts/CollectionReport.tsx       ← pagination + export + ملخص
```

