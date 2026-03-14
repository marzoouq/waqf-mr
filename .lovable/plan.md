

# تحسين فواتير العقود — 5 تحسينات

## 1. أزرار إجراء في دفعات الـ Accordion (`ContractAccordionGroup.tsx`)

حالياً الدفعات داخل العقد المنسدل تعرض الحالة والمبلغ فقط. التحسين: إضافة أيقونات صغيرة لكل دفعة (تسديد ✓ / إلغاء ✗ / تحميل PDF ↓).

- إضافة props: `onPayInvoice`, `onUnpayInvoice`, `onDownloadInvoice`, `isClosed` للمكوّن
- عرض الأزرار بجانب كل دفعة بحسب حالتها

## 2. تجميع جدول الفواتير في Desktop (`PaymentInvoicesTab.tsx`)

الموبايل مُجمَّع حسب العقد لكن Desktop لا يزال جدول مسطح. التحسين: إضافة صفوف عناوين (header rows) تفصل بين العقود المختلفة في الجدول.

- تجميع `paginated` بـ `contract_id`
- إدراج صف عنوان `colSpan` لكل مجموعة يعرض رقم العقد واسم المستأجر

## 3. ترتيب بالأعمدة (`PaymentInvoicesTab.tsx`)

إضافة `sortKey` و `sortDir` state + أيقونات ترتيب على رؤوس الأعمدة (تاريخ الاستحقاق، المبلغ، الحالة).

## 4. تسديد جماعي (`PaymentInvoicesTab.tsx`)

- إضافة `Checkbox` لكل فاتورة غير مسددة
- زر "تسديد المختارة" يظهر عند تحديد فواتير
- تنفيذ متتابع مع شريط تقدم

## 5. فلتر نطاق التاريخ (`PaymentInvoicesTab.tsx`)

إضافة حقلي تاريخ (من/إلى) بجانب البحث لفلترة الفواتير حسب `due_date`.

## الملفات المتأثرة

```text
src/components/contracts/ContractAccordionGroup.tsx ← أزرار إجراء للدفعات
src/components/contracts/PaymentInvoicesTab.tsx     ← تجميع Desktop + ترتيب + تسديد جماعي + فلتر تاريخ
src/pages/dashboard/ContractsPage.tsx              ← تمرير callbacks جديدة للـ Accordion
```

