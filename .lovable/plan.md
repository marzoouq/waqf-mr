

# إصلاحات الجوال لصفحات لوحة تحكم المستفيدين

## الصفحات التي تحتاج إصلاحات

### 1. `InvoicesViewPage.tsx` — لا يوجد عرض بطاقات للجوال
الجدول يستخدم `min-w-[700px]` مع scroll أفقي فقط. لا يوجد `isMobile` أو بطاقات بديلة.
**الإصلاح:** إضافة عرض بطاقات جوال (md:hidden) مع إخفاء الجدول (hidden md:block)، كما هو مُطبّق في ContractsViewPage وMySharePage.

### 2. `InvoicesViewPage.tsx` — التاريخ خام في الجدول
السطر 164: `{item.date}` يعرض التاريخ ISO بدون تنسيق.
**الإصلاح:** إضافة `toLocaleDateString('ar-SA')`.

### 3. `InvoiceGridView.tsx` — التاريخ خام في البطاقات
السطر 131: `{inv.date}` خام.
**الإصلاح:** تنسيق التاريخ بالعربي.

### 4. `DisclosurePage.tsx` — حالة العقد `cancelled` لا تُترجم
السطر 371: `c.status === 'expired' ? 'منتهي' : c.status` — حالة `cancelled` تظهر إنجليزية.
**الإصلاح:** إضافة `c.status === 'cancelled' ? 'ملغي'`.

### 5. `FinancialReportsPage.tsx` — YAxis ضيقة على الجوال
`width={50}` ثابت على محور Y في الرسوم البيانية مما يض