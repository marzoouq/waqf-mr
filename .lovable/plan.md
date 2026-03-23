

# مشكلة عدم تطابق PDF المحمّل مع المعاينة

## المشكلة الجذرية

يوجد **نظامان منفصلان تماماً** لرسم الفاتورة:

1. **المعاينة (Preview):** مكونات React (`ProfessionalTemplate` + `SimplifiedTemplate` في `InvoiceTemplates.tsx`) — تعرض التصميم الجديد بالألوان والتنسيق الحديث
2. **تحميل PDF:** دوال `jsPDF` (`renderTaxProfessional` + `renderCompact` في `paymentInvoice.ts`) — تصميم مختلف تماماً مبني يدوياً بالإحداثيات

عند الضغط على "تحميل PDF" من نافذة المعاينة، يتم استدعاء `generatePaymentInvoicePDF` مع قالب `tax_professional` — وهو **ليس نفس التصميم** الذي يراه المستخدم في المعاينة.

## الحل

تحويل تحميل PDF ليستخدم **نفس ما يراه المستخدم في المعاينة** عبر تقنية HTML-to-PDF:

### الملف: `src/components/invoices/InvoicePreviewDialog.tsx`

عند الضغط على "تحميل PDF":
1. أخذ لقطة من المحتوى المعروض في `#invoice-preview-content` باستخدام `html2canvas`
2. تحويل الصورة إلى PDF باستخدام `jsPDF`
3. تحميل الملف

### التغييرات المطلوبة:

| الملف | التغيير |
|-------|---------|
| `package.json` | إضافة `html2canvas` |
| `src/components/invoices/InvoicePreviewDialog.tsx` | استبدال `onDownloadPdf` بدالة محلية تأخذ لقطة من `#invoice-preview-content` وتحولها لـ PDF |
| `src/components/contracts/PaymentInvoicesTab.tsx` | تبسيط `onDownloadPdf` — لم يعد يحتاج تحويل القالب |
| `src/pages/dashboard/InvoicesPage.tsx` | تبسيط `onDownloadPdf` — نفس المنطق |

### المنطق الجديد في `InvoicePreviewDialog`:

```typescript
const handleDownloadPdf = async () => {
  const element = document.getElementById('invoice-preview-content');
  if (!element) return;
  
  const canvas = await html2canvas(element, { scale: 2, useCORS: true });
  const imgData = canvas.toDataURL('image/png');
  
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(`فاتورة-${invoice.invoiceNumber}.pdf`);
};
```

### النتيجة
- **تطابق 100%** بين المعاينة والـ PDF المحمّل
- لا حاجة لصيانة تصميمين منفصلين
- القالب المختار (احترافي/مبسط) في المعاينة هو نفسه الذي يُصدّر

### ملاحظة
دوال `renderTaxProfessional` و `renderCompact` في `paymentInvoice.ts` تبقى كما هي — تُستخدم من Edge Function للتصدير الجماعي (batch export) بدون معاينة.

