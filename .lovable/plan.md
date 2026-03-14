

## إصلاح تصدير الفاتورة الضريبية

### المشكلة
دالة `handleDownloadPdf` في `PaymentInvoicesTab.tsx` تستدعي `generatePaymentInvoicePDF` لكنها:
1. لا تنتظر النتيجة (`await`) — الدالة ليست `async`
2. لا تستخدم رابط الـ blob المُرجَع لفتح/تحميل الملف
3. لا تُظهر حالة تحميل أو رسالة نجاح/خطأ للمستخدم

### الحل
تعديل `handleDownloadPdf` في `PaymentInvoicesTab.tsx`:
- جعلها `async` مع `await`
- استخدام الرابط المُرجَع لفتح الفاتورة في نافذة جديدة (`window.open`)
- إضافة حالة تحميل (`loadingInvoiceId`) لتعطيل الزر أثناء التوليد
- إظهار toast نجاح/خطأ عبر `sonner`

### التفاصيل التقنية
- إضافة `state` لتتبع الفاتورة قيد التوليد: `const [loadingInvoiceId, setLoadingInvoiceId] = useState<string | null>(null)`
- عند النجاح: فتح blob URL في تبويب جديد + toast "تم تصدير الفاتورة بنجاح"
- عند الفشل: toast خطأ "حدث خطأ أثناء تصدير الفاتورة"
- تعطيل زر التحميل وعرض spinner أثناء التوليد

### الملفات المتأثرة
- `src/components/contracts/PaymentInvoicesTab.tsx` — إصلاح واحد فقط

