

# خطة إصلاح تصدير تقارير PDF

## المشكلة

عند الضغط على زر "تصدير PDF" في صفحة التقارير، يظهر خطأ:
```text
TypeError: doc.autoTable is not a function
```

السبب: طريقة استيراد مكتبة `jspdf-autotable` كـ side-effect import لا تعمل بشكل صحيح مع Vite.

## الحل

### تعديل ملف واحد: `src/utils/pdfGenerator.ts`

1. تغيير طريقة استيراد `jspdf-autotable` من side-effect import إلى استيراد default وتطبيقه يدوياً:

```text
- قبل: import 'jspdf-autotable'
- بعد: import autoTable from 'jspdf-autotable'
```

2. استبدال كل استدعاء `doc.autoTable(...)` بـ `autoTable(doc, ...)` وهي الطريقة الصحيحة لاستخدام المكتبة.

3. تحديث طريقة الحصول على `finalY` بعد الجدول باستخدام الـ return value من `autoTable`.

### التعديلات بالتفصيل:

- السطر 2: تغيير الاستيراد
- إزالة `declare module` (الأسطر 4-8) لأنها لم تعد مطلوبة
- الأسطر 41، 64، 106: تغيير `doc.autoTable({...})` إلى `autoTable(doc, {...})`
- السطر 58: تحديث طريقة الحصول على `finalY` من القيمة المرجعة

## النتيجة المتوقعة

- زر "تصدير PDF" سيعمل بدون أخطاء
- سيتم تحميل ملف PDF يحتوي على التقرير السنوي مع جداول البيانات
- النصوص العربية ستظهر (مع ملاحظة أن الخط الافتراضي helvetica لا يدعم العربية بالكامل، لكن هذا تحسين مستقبلي)

