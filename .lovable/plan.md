

# إصلاح مشكلة فتح الفواتير - عرض داخلي بدلاً من نافذة خارجية

## المشكلة الحقيقية

جميع الأماكن الأربعة التي تفتح الفواتير تستخدم:
```typescript
window.open(url, '_blank');
```
هذا يفتح **نافذة خارجية جديدة** يتم حظرها من المتصفح (popup blocker). المشكلة ليست في تحميل الملف بل في طريقة العرض.

## الحل

عرض الفواتير **داخل التطبيق** باستخدام Dialog يحتوي على `<iframe>` للـ PDF أو `<img>` للصور، مع زر تحميل مباشر كبديل.

## التغييرات المطلوبة

### 1. إنشاء مكوّن عارض الفواتير (جديد)
ملف: `src/components/invoices/InvoiceViewer.tsx`

- Dialog يعرض الملف داخل التطبيق
- يدعم PDF (عبر iframe/embed) والصور (عبر img)
- يحتوي على زر تحميل مباشر (باستخدام `<a download>`)
- يعرض حالة التحميل أثناء جلب الملف

### 2. تحديث 4 ملفات لاستبدال `window.open` بالعارض الداخلي

الملفات المتأثرة:
- `src/pages/dashboard/InvoicesPage.tsx`
- `src/pages/beneficiary/InvoicesViewPage.tsx`
- `src/components/invoices/InvoiceGridView.tsx`
- `src/components/expenses/ExpenseAttachments.tsx`

في كل ملف:
- إضافة state لتتبع الملف المختار (`selectedFile`)
- استبدال `window.open(url, '_blank')` بفتح الـ Dialog
- إضافة مكوّن `InvoiceViewer` في JSX

### 3. إضافة دالة تحميل مباشر
في `src/hooks/useInvoices.ts` إضافة دالة `downloadInvoiceFile` تستخدم `<a>` مخفي لتحميل الملف مباشرة بدون فتح نافذة.

## التفاصيل التقنية

المكوّن الجديد `InvoiceViewer`:
```
Dialog (ملء الشاشة تقريباً)
├── DialogHeader: اسم الملف + زر تحميل
└── DialogContent:
    ├── إذا PDF → iframe/object عرض مباشر
    ├── إذا صورة → img tag
    └── أنواع أخرى → رسالة + زر تحميل
```

- يستخدم `getInvoiceSignedUrl` (التي تعمل بـ download + blob) لجلب الملف
- يعرض الـ blob URL داخل iframe/img بدون فتح نافذة خارجية
- يدعم أنواع الملفات: PDF, PNG, JPG, JPEG, WebP

