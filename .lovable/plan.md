

# إضافة تصدير PDF للفواتير المتأخرة

## الفكرة
إضافة دالة `generateOverdueInvoicesPDF` تُنشئ تقرير PDF يحتوي على جميع الفواتير المتأخرة مع ملخص مالي، وزر تصدير في واجهة `PaymentInvoicesTab` يظهر عند وجود فواتير متأخرة.

## التغييرات

### ملف جديد: لا — نضيف الدالة في `src/utils/pdf/invoices.ts`
- دالة `generateOverdueInvoicesPDF` تستقبل مصفوفة `PaymentInvoice[]` و `PdfWaqfInfo`
- تُصفّي الفواتير المتأخرة فقط (`status === 'overdue'`)
- تعرض جدول: رقم الفاتورة، المستأجر، رقم العقد، العقار، تاريخ الاستحقاق، المبلغ، أيام التأخر
- ملخص أعلى الجدول: عدد الفواتير المتأخرة + إجمالي المبالغ
- تذييل الجدول بإجمالي المبالغ
- رأس الجدول بلون أحمر (`TABLE_HEAD_RED`) للتمييز عن التقارير العادية
- تحميل مباشر عبر `doc.save()`

### تعديل: `src/utils/pdf/index.ts`
- إضافة `export { generateOverdueInvoicesPDF } from './invoices'`

### تعديل: `src/components/contracts/PaymentInvoicesTab.tsx`
- استيراد `generateOverdueInvoicesPDF`
- إضافة زر "تصدير المتأخرة PDF" بجانب أدوات البحث والفلترة (سطر ~227)
- الزر يظهر فقط عندما `summary.overdue > 0`
- يستخدم أيقونة `AlertTriangle` + `FileDown` بلون أحمر

