

# فحص جنائي عميق: تحميل/تصدير الملفات، مشاكل الخطوط، ونسخة الفاتورة الجديدة

---

## ملخص النتائج

تم فحص **18 ملفاً** مرتبطاً بتوليد PDF وتحميل الملفات ونظام الفواتير. النتيجة: **4 مشاكل حقيقية** تحتاج إصلاح + **2 تحسين مُوصى به**.

---

## المشاكل المكتشفة

### 1. [خطأ] تسريب ذاكرة Blob URL في `PaymentInvoicesTab.tsx`

**السطر 237:** يتم استدعاء `URL.revokeObjectURL(blobUrl)` مباشرة بعد `a.click()`، لكن عند فشل التحميل (catch block) لا يتم تحرير الـ Blob URL أبداً. أيضاً إذا نجح `generatePaymentInvoicePDF` لكن المستخدم لم يحمّل الملف (أو تم إلغاء التنزيل)، لا يوجد آلية تنظيف.

**الأهم:** الدالة `generatePaymentInvoicePDF` ترفع الملف إلى Storage ثم ترجع `URL.createObjectURL(pdfBlob)` — لكنها لا تُحرر الـ Blob أبداً داخلياً. عند الفشل في الرفع تستدعي `doc.save()` كـ fallback لكن تُرجع `null` دون تحرير.

**الإصلاح:** إضافة `finally` block يُحرّر الـ Blob URL في `handleDownloadPdf`.

---

### 2. [خطأ] مسار ملف غير مُعقّم في retry upload بـ `paymentInvoice.ts`

**السطر 741:** عند فشل الرفع الأول بسبب ملف موجود، يتم إعادة المحاولة بمسار:
```ts
const timestampPath = `payment-invoices/${invoice.invoiceNumber}-${Date.now()}.pdf`;
```
لكن `invoice.invoiceNumber` هنا **لم يُعقّم** (لم يمر عبر `sanitizePath`). فقط المسار الأول يستخدم `sanitizePath`. هذا يعني أن رقم فاتورة يحتوي على `/` أو `..` يمكنه التسبب بـ path traversal في المسار البديل.

**الإصلاح:** تطبيق `sanitizePath` على `timestampPath` أيضاً:
```ts
const timestampPath = `payment-invoices/${sanitizePath(invoice.invoiceNumber)}-${Date.now()}.pdf`;
```

---

### 3. [تحذير] خطوط Edge Function تعتمد على bucket عام (`waqf-assets`)

**السطر 176 في `generate-invoice-pdf/index.ts`:**
```ts
const FONT_BASE_URL = `${SUPABASE_URL}/storage/v1/object/public/waqf-assets/fonts`;
```
الخطوط تُجلب من `waqf-assets` bucket. لكن:
- لا يوجد retry عند فشل الجلب (خلاف الكود الأمامي الذي يستخدم `fetchFontWithRetry`)
- لا يوجد فحص حجم الملف (الكود الأمامي يرفض ملفات < 1000 بايت)
- إذا فشل جلب الخط، الـ Edge Function ينهار بالكامل بدلاً من fallback

**الإصلاح:** إضافة retry + size validation في `fetchFont()` بالـ Edge Function (مشابه لـ `fetchFontWithRetry` في الكود الأمامي).

---

### 4. [خطأ] `upsert: false` يمنع تحديث ملفات PDF المُولّدة

**السطر 735-738 في `paymentInvoice.ts`:**
```ts
.upload(storagePath, pdfBlob, {
  contentType: 'application/pdf',
  upsert: false,
});
```
**والسطر 632-635 في Edge Function:**
```ts
.upload(storagePath, pdfBytes, {
  contentType: "application/pdf",
  upsert: false,
});
```

باستخدام `upsert: false`، إذا أعاد المستخدم توليد فاتورة بنفس الرقم:
- **الكود الأمامي** يُعالج الخطأ بإضافة timestamp — لكن هذا يُنتج ملفات يتيمة (orphan files) بدون آلية تنظيف
- **Edge Function** يفشل مباشرة ويُبلّغ بخطأ

**الإصلاح:** في الكود الأمامي: استخدام `upsert: true` مع حذف الملف القديم أولاً. في Edge Function: نفس المنطق.

---

## تحسينات مُوصى بها

### 5. [تحسين] معاينة الفاتورة الجديدة لا تدعم تحميل PDF مباشر

**`InvoicePreviewDialog.tsx` سطر 38:** زر "تحميل PDF" يظهر فقط عندما يُمرر `onDownloadPdf` prop. لكن عند استدعائه من `PaymentInvoicesTab` (سطر 324-328) لا يتم تمرير هذا الـ prop:
```tsx
<InvoicePreviewDialog
  open={!!previewInvoice}
  onOpenChange={...}
  invoice={previewInvoice}
  // ← onDownloadPdf مفقود!
/>
```
المستخدم يفتح المعاينة الجديدة الاحترافية لكن **لا يستطيع تحميلها كـ PDF** من داخل الحوار.

**الإصلاح:** تمرير `onDownloadPdf` الذي يستدعي `handleDownloadPdf` للفاتورة المعروضة حالياً.

---

### 6. [تحسين] نقص التوافق بين قالب المعاينة (HTML) وقالب PDF

القالب الجديد (`InvoiceTemplates.tsx`) يدعم:
- بنود متعددة (Multi-line Items)
- خصومات ورسوم إضافية (AllowanceCharge)
- بيانات مشتري متقدمة (عنوان كامل + هوية + سجل تجاري)

لكن قالب PDF (`paymentInvoice.ts`) يدعم **بنداً واحداً فقط** ولا يدعم الخصومات/الرسوم. هذا يعني أن ما يراه المستخدم في المعاينة يختلف عما يُصدّر كـ PDF.

**الإصلاح:** تحديث `renderLineItemsTable` في `paymentInvoice.ts` ليدعم بنود متعددة وخصومات/رسوم من `CreateInvoiceFromTemplate`.

---

## الملفات المتأثرة بالإصلاحات

| # | الملف | الإصلاح |
|---|-------|---------|
| 1 | `src/components/contracts/PaymentInvoicesTab.tsx` | تحرير Blob URL + ربط `onDownloadPdf` بالمعاينة |
| 2 | `src/utils/pdf/paymentInvoice.ts` | تعقيم مسار retry + `upsert: true` |
| 3 | `supabase/functions/generate-invoice-pdf/index.ts` | retry خطوط + size validation + `upsert: true` |

---

## نتائج فحص الخطوط

| المكون | الآلية | الحالة |
|--------|--------|--------|
| الكود الأمامي (`core.ts`) | `fetchFontWithRetry` + cache + size check (>1000 bytes) + fallback لـ Helvetica | ✅ محصّن |
| Edge Function (`generate-invoice-pdf`) | fetch واحد بدون retry/size check + لا fallback | ⚠️ يحتاج تحسين |
| قوالب HTML (`InvoiceTemplates.tsx`) | يستخدم `font-family` CSS فقط — لا يحتاج تحميل خطوط | ✅ لا مشكلة |
| `loadAmiriFonts.ts` | حقن @font-face ديناميكي — يعمل للطباعة فقط | ✅ سليم |

