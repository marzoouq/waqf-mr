

# إضافة قيود حجم الملفات وأنواع MIME على مستودعات التخزين

## الهدف
تعزيز حماية مستودعات التخزين بإضافة قيود على مستوى قاعدة البيانات لمنع رفع ملفات غير مسموح بها أو كبيرة الحجم.

## التغييرات المطلوبة

### تحديث مستودع `invoices` (خاص)
- **الحجم الأقصى:** 10 ميجابايت (10485760 بايت)
- **الأنواع المسموحة:** PDF, JPG, PNG, WEBP

### تحديث مستودع `waqf-assets` (عام)
- **الحجم الأقصى:** 5 ميجابايت (5242880 بايت)
- **الأنواع المسموحة:** JPG, PNG, WEBP, SVG

## التفاصيل الفنية

سيتم تنفيذ migration واحد يحتوي على:

```sql
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf','image/jpeg','image/png','image/webp']
WHERE id = 'invoices';

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/svg+xml']
WHERE id = 'waqf-assets';
```

**لا توجد تغييرات على الكود البرمجي** - هذه قيود على مستوى قاعدة البيانات فقط تُطبّق تلقائياً عند محاولة الرفع.

