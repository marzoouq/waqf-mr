

## تحليل المشكلة

صفحة العقارات للمستفيد (`PropertiesViewPage.tsx`) تستخدم `useContractsByFiscalYear` الذي يستعلم من جدول `contracts` مباشرة. لكن سياسة RLS على `contracts` تمنع المستفيد من الوصول (مقتصرة على admin و accountant فقط). لذلك يعود الاستعلام فارغاً وتظهر جميع الأرقام المالية كـ 0.

**الحل**: تغيير `PropertiesViewPage.tsx` لاستخدام `useContractsSafeByFiscalYear` بدلاً من `useContractsByFiscalYear`. عرض `contracts_safe` مصمم خصيصاً للمستفيد/الواقف ويحتوي على جميع الأعمدة المطلوبة (`property_id`, `unit_id`, `status`, `rent_amount`, `payment_type`, `payment_amount`, `payment_count`).

### التغييرات المطلوبة

| الملف | التغيير |
|-------|---------|
| `src/pages/beneficiary/PropertiesViewPage.tsx` سطر 7 | تغيير الاستيراد من `useContractsByFiscalYear` إلى `useContractsSafeByFiscalYear` |
| `src/pages/beneficiary/PropertiesViewPage.tsx` سطر 32 | استخدام `useContractsSafeByFiscalYear(fiscalYearId)` بدل `useContractsByFiscalYear(fiscalYearId)` |

تغيير بسيط في سطرين فقط. لا حاجة لتعديل قاعدة البيانات.

### ملاحظة

يجب التحقق من باقي صفحات المستفيد (`ContractsViewPage`, `AccountsViewPage`, إلخ) للتأكد أنها تستخدم `contracts_safe` وليس `contracts` مباشرة.

