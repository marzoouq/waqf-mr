

## إصلاح حظر النافذة المنبثقة عند تصدير الفاتورة

### المشكلة
المتصفحات تحظر `window.open()` عندما تُستدعى بعد عملية غير متزامنة (async) لأنها لم تعد ضمن سياق تفاعل المستخدم المباشر (click event). هذا يمنع فتح الفاتورة في تبويب جديد.

### الحل
استبدال `window.open()` باستخدام مكون `InvoiceViewer` الموجود فعلاً في المشروع — وهو يعرض الملف داخل Dialog بدون الحاجة لفتح نافذة جديدة، ويدعم PDF والصور مع زر تحميل مدمج.

### التعديلات — ملف واحد: `PaymentInvoicesTab.tsx`

1. **إضافة import** لمكون `InvoiceViewer`
2. **إضافة state** لتتبع ملف العرض: `viewerFile: { path: string; name: string } | null`
3. **تعديل `handleDownloadPdf`**: بعد توليد PDF بنجاح، بدلاً من `window.open(blobUrl)`:
   - حفظ `file_path` الفاتورة في `viewerFile` state لفتح `InvoiceViewer`
   - أو استخدام رابط تحميل مباشر عبر `<a>` element بدلاً من `window.open`
4. **إضافة مكون `InvoiceViewer`** في نهاية JSX

**الطريقة المختارة**: استخدام `InvoiceViewer` (متسق مع باقي صفحات الفواتير) + إضافة زر تحميل مباشر كبديل عبر إنشاء `<a>` element مع `click()` بدلاً من `window.open` للتحميل الفوري دون حظر.

