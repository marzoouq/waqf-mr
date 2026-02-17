

# إضافة دعم السحب والإفلات (Drag & Drop) لمنطقة رفع الفاتورة

## الوصف
إضافة إمكانية سحب ملف وإفلاته مباشرة على منطقة رفع الفاتورة، مع تغيير مرئي عند السحب فوق المنطقة، مع الاحتفاظ بنفس منطق التحقق من نوع وحجم الملف الموجود حالياً.

## التعديلات المطلوبة

### ملف واحد: `src/pages/dashboard/InvoicesPage.tsx`

1. **إضافة حالة السحب**: إضافة `isDragging` state لتتبع ما إذا كان المستخدم يسحب ملفاً فوق المنطقة.

2. **إضافة أحداث السحب والإفلات** على عنصر `div` الخاص بمنطقة الرفع:
   - `onDragOver` و `onDragEnter`: منع السلوك الافتراضي وتفعيل `isDragging`.
   - `onDragLeave`: إلغاء `isDragging`.
   - `onDrop`: استقبال الملف وتطبيق نفس منطق التحقق (النوع والحجم) الموجود في `onChange`.

3. **استخراج دالة تحقق مشتركة**: نقل منطق التحقق من النوع والحجم إلى دالة `validateAndSetFile(file)` تُستخدم من كل من `onChange` و `onDrop` لتجنب تكرار الكود.

4. **تغيير مرئي عند السحب**: تغيير لون حدود المنطقة ولون الخلفية عند `isDragging` (مثلاً: `border-primary bg-primary/5`) لإعطاء المستخدم إشارة بصرية واضحة.

5. **تحديث نص الإرشاد**: النص الحالي يقول "اضغط لاختيار ملف أو اسحبه هنا" وهو مناسب بالفعل.

## التفاصيل التقنية

### دالة التحقق المشتركة
```text
validateAndSetFile(file: File):
  -> فحص file.type ضد ALLOWED_MIME_TYPES
  -> فحص file.size ضد 10MB
  -> صالح: setSelectedFile(file) + setFileError('')
  -> غير صالح: setSelectedFile(null) + setFileError(رسالة) + مسح input
```

### أحداث الـ Drag & Drop
```text
onDragOver/onDragEnter:
  -> e.preventDefault() + e.stopPropagation()
  -> setIsDragging(true)

onDragLeave:
  -> setIsDragging(false)

onDrop:
  -> e.preventDefault() + e.stopPropagation()
  -> setIsDragging(false)
  -> validateAndSetFile(e.dataTransfer.files[0])
```

### تغيير الأنماط
```text
className ديناميكي:
  - عادي: border-dashed border-2
  - أثناء السحب (isDragging): border-primary bg-primary/5 border-solid
```

التعديل بسيط ومحصور في ملف واحد فقط دون أي تأثير على بقية التطبيق.
