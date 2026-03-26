

# إصلاح تحميل vendor-pdf المبكر — المرحلة الثانية

## المشكلة
رغم تحويل 6 ملفات إلى dynamic import في المرحلة السابقة، لا تزال **5 ملفات** تستخدم `import autoTable from 'jspdf-autotable'` كاستيراد ثابت. مكتبة `jspdf-autotable` تعتمد على `jspdf`، مما يسحب `vendor-pdf` (~186KB gzip) إلى التحميل الأولي.

## الملفات المطلوب تعديلها

| الملف | الاستيراد الحالي | التغيير |
|-------|-----------------|---------|
| `src/utils/pdf/reports.ts` | `import autoTable from 'jspdf-autotable'` | حذف السطر + `const { default: autoTable } = await import('jspdf-autotable')` داخل كل دالة تستخدمه |
| `src/utils/pdf/invoices.ts` | `import autoTable from 'jspdf-autotable'` | نفس التغيير |
| `src/utils/pdf/forensicAudit.ts` | `import autoTable from 'jspdf-autotable'` | نفس التغيير |
| `src/utils/pdf/bylaws.ts` | `import autoTable from 'jspdf-autotable'` | نفس التغيير |
| `src/utils/pdf/comparison.ts` | `import autoTable from 'jspdf-autotable'` | نفس التغيير |

## ملاحظة مهمة
بعد التعديل، يجب **نشر التطبيق** (Update) ثم إعادة فحص الموقع المنشور للتأكد أن `vendor-pdf` لم يعد يظهر في طلبات الشبكة عند التحميل الأولي.

## النتيجة المتوقعة
- `vendor-pdf` يُحمّل **فقط** عند طلب تصدير PDF فعلياً
- توفير ~186KB gzip (~500KB raw) من التحميل الأولي
- تحسّن ملحوظ في سرعة الصفحة الأولى

