

# تقرير الفحص المتقدم — نظام الفواتير والتصدير (الجزء الثاني)

بعد مراجعة شاملة لـ **8 ملفات** إضافية، تم اكتشاف **6 مشاكل** متبقية تحتاج إصلاح:

---

## المشاكل المكتشفة

### 1. [خطأ حرج] فقدان بيانات البنود عند حفظ الفاتورة — `CreateInvoiceFromTemplate.tsx`
**السطر 156:** عند الحفظ، يتم أخذ `vat_rate` من **أول بند فقط**:
```ts
vat_rate: items[0]?.vatRate || 15,
```
إذا أضاف المستخدم بنوداً بنسب ضريبية مختلفة (مثلاً بند إيجار 15% وبند صيانة 0%)، يُحفظ 15% فقط. أيضاً الوصف يُسطَّح بـ `join(' | ')` مما يفقد هيكل البنود.

**الإصلاح:** حساب `vat_rate` كمعدل مرجح (weighted average) بناءً على مبالغ البنود، أو تخزين البنود بشكل منفصل في جدول `invoice_items`.

### 2. [خطأ] PDF لا يدعم بنوداً متعددة — `paymentInvoice.ts`
**السطر 140-183:** دالة `renderLineItemsTable` تولّد **صفاً واحداً فقط** دائماً ("`إيجار — دفعة X`"). حتى لو حُفظت الفاتورة ببنود متعددة من القالب، يظهر في PDF بند واحد فقط.

**الإصلاح:** توسيع `PaymentInvoicePdfData` ليدعم مصفوفة `items` اختيارية، وتعديل `renderLineItemsTable` لتوليد صفوف متعددة عند توفرها.

### 3. [خطأ] Edge Function تدعم جدول `invoices` فقط — `generate-invoice-pdf/index.ts`
**السطر 606-609:** يستعلم من `invoices` فقط ولا يدعم `payment_invoices`. أي محاولة لتوليد PDF لفاتورة دفعة من الخادم ستفشل.

**الإصلاح:** إضافة parameter `table` في body الطلب، ودعم الاستعلام من `payment_invoices` مع mapping البيانات.

### 4. [تحذير] تسريب ذاكرة محتمل — `InvoicesPage.tsx`
**السطر 136:** عند رفع صورة كمعاينة، يُنشأ `URL.createObjectURL(file)` لكن إذا رفع المستخدم ملفاً ثانياً **قبل الإغلاق**، الـ URL القديم لا يُحرّر. دالة `cleanup` في السطر 114 تعمل فقط عند unmount.

**الإصلاح:** تحرير الـ URL القديم قبل إنشاء الجديد في `validateAndSetFile`:
```ts
if (previewUrl) URL.revokeObjectURL(previewUrl);
```

### 5. [تحذير] مسار storage غير مُعقّم في Edge Function — `generate-invoice-pdf/index.ts`
**السطر 643:** اسم الملف يُبنى مباشرة من `invoice.invoice_number` بدون sanitization:
```ts
const fileName = `${invoice.invoice_number || invoice.id}.pdf`;
```
يمكن لرقم فاتورة يحتوي على `../` أن يكتب في مسار غير متوقع.

**الإصلاح:** تطبيق sanitization مشابه لـ `sanitizePath` في الكود الأمامي.

### 6. [تحذير] خلل في حساب المبلغ — `buildPreviewData` في كلتا الصفحتين
**السطرين 101 في `InvoicesPage.tsx` و 282 في `PaymentInvoicesTab.tsx`:** يحسب `unitPrice` كـ `amount - vat_amount`. لكن إذا كان `vat_amount` = `null` (قبل الحساب)، يُرجع `safeNumber(null)` = 0 فيظهر `unitPrice = amount` — وهذا صحيح عندما لا توجد ضريبة. لكن إذا كانت الضريبة محسوبة ولم تُحفظ بعد في قاعدة البيانات (حالة فاتورة جديدة)، يظهر المبلغ خطأ في المعاينة.

**الإصلاح:** حساب `unitPrice` بالقسمة العكسية: `amount / (1 + vatRate/100)` عندما يكون `vat_amount` غير متاح.

---

## خطة التنفيذ (مرتبة بالأولوية)

| # | الملف | الإصلاح | التعقيد |
|---|-------|---------|---------|
| 1 | `InvoicesPage.tsx` | تحرير Blob URL القديم عند رفع ملف جديد | منخفض |
| 2 | `generate-invoice-pdf/index.ts` | sanitize اسم الملف في storage path | منخفض |
| 3 | `CreateInvoiceFromTemplate.tsx` | حساب `vat_rate` كمعدل مرجح | متوسط |
| 4 | `InvoicesPage.tsx` + `PaymentInvoicesTab.tsx` | حساب `unitPrice` بقسمة عكسية كـ fallback | متوسط |
| 5 | `paymentInvoice.ts` | دعم بنود متعددة في `renderLineItemsTable` | متوسط |
| 6 | `generate-invoice-pdf/index.ts` | دعم جدول `payment_invoices` | عالي |

