

# خطة إصلاح تناقض تصميم الفاتورة بين المعاينة والتصدير

## المشكلة المكتشفة

هناك مساران مختلفان تماماً لعرض وتصدير الفواتير:

```text
المعاينة (Preview)                    التصدير (Export)
─────────────────                    ────────────────
React Components                     Edge Function (pdf-lib)
ProfessionalTemplate                 تصميم قديم ثابت
SimplifiedTemplate                   حدود ذهبية + جدول بسيط
هيدر زمردي حديث                      لا يدعم اختيار القالب
بنود متعددة + خصومات                 صف واحد فقط
```

**السبب الجذري:** وظيفة `generate-invoice-pdf` (Edge Function) تتجاهل بارامتر `template` بالكامل (السطر 620)، وتستخدم تصميماً قديماً ثابتاً بـ `pdf-lib` لا يتطابق مع القوالب الحديثة في المعاينة.

**ملاحظة مهمة:** صفحة `PaymentInvoicesTab` لا تعاني من نفس المشكلة لأنها تستخدم `generatePaymentInvoicePDF` (client-side jsPDF) الذي يدعم 3 قوالب حديثة.

## الحل المقترح

توحيد مسار التصدير في `InvoicesPage` ليستخدم نفس نظام القوالب الموجود في `paymentInvoice.ts` بدلاً من Edge Function القديمة.

### التغييرات المطلوبة:

**1. إنشاء `src/utils/pdf/invoice.ts`** — دالة تصدير فواتير عادية (client-side jsPDF)
- تستخدم نفس البنية التحتية الموجودة (`core.ts`, `pdfHelpers.ts`)
- تدعم القالبين: `tax_professional` و `compact`
- تتطابق بصرياً مع `ProfessionalTemplate` و `SimplifiedTemplate` في React
- ترفع الملف إلى Storage وتحدّث `file_path` في جدول `invoices`

**2. تحديث `src/utils/pdf/index.ts`** — تصدير الدالة الجديدة

**3. تحديث `src/pages/dashboard/InvoicesPage.tsx`**
- استبدال استدعاء `generatePdf.mutate()` (Edge Function) بالدالة المحلية الجديدة
- تحويل اسم القالب: `professional` → `tax_professional`، `simplified` → `compact`

### التفاصيل التقنية:

الدالة الجديدة `generateInvoicePDF` ستعيد استخدام:
- `loadArabicFont`, `addFooter`, `reshapeArabic` من `core.ts`
- `loadLogoBase64`, `TABLE_HEAD_GREEN` من `core.ts`
- `generateZatcaQrTLV`, `generateQrDataUrl` من `zatcaQr.ts`
- نفس بنية `renderTaxProfessional` و `renderCompact` من `paymentInvoice.ts` مع تعديلات طفيفة لبيانات جدول `invoices`

**ملاحظة:** Edge Function `generate-invoice-pdf` ستبقى كما هي كـ fallback لتوليد PDF دفعي (bulk) لكن لن تُستخدم من نافذة المعاينة.

