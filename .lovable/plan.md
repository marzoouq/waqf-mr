

# تقرير الفحص الجنائي — تحقق من مشاكل إصدار الفواتير

---

## النتائج

### M-01: بيانات المشتري مفقودة في PDF فواتير الدفعات — ✅ مشكلة حقيقية

**الدليل المباشر:**

`PaymentInvoicesTab.tsx` سطر 213-229 — `handleDownloadPdf`:
```typescript
generatePaymentInvoicePDF({
  id, invoiceNumber, contractNumber, tenantName, propertyNumber,
  paymentNumber, totalPayments, amount, dueDate, status,
  paidDate, paidAmount, notes, vatRate, vatAmount,
  // ❌ لا يوجد: tenantVatNumber, tenantAddress
})
```

بينما `buildPaymentPreviewData` (سطر 255-294) يجلب `fullContract` ويمرر `buyerVatNumber`, `buyerStreet`, `buyerCity`... إلخ.

**السيناريو:** مستخدم يعاين فاتورة احترافية ← يرى بيانات المشتري الضريبية ← يضغط "تحميل PDF" ← الملف يصدر بدون الرقم الضريبي والعنوان.

**التأثير:** مخالفة ZATCA Phase 2 للفواتير القياسية (B2B).

---

### M-02: مطابقة الفاتورة في InvoicesPage — 🟡 مشكلة حقيقية لكن منخفضة الاحتمال

**الدليل المباشر:**

`InvoicesPage.tsx` سطر 507-509:
```typescript
const origInv = invoices.find(i =>
  (i.invoice_number && i.invoice_number === previewInvoice?.invoiceNumber) ||
  `INV-${i.id.slice(0, 6)}` === previewInvoice?.invoiceNumber
);
```

- `InvoiceTemplateData` لا يحتوي على حقل `id` (مؤكد من سطر 21-57).
- `buildPreviewData` (سطر 82) يولد `invoiceNumber: inv.invoice_number || \`INV-${inv.id.slice(0,6)}\``
- المطابقة تعتمد على `invoice_number` أو fallback `INV-xxx` — **تعمل في الحالة الطبيعية**.
- **لكن**: إذا كان لفاتورتين نفس أول 6 أحرف من UUID (احتمال ضعيف جداً)، قد تتطابق مع الخطأ.
- **السيناريو الأخطر**: لو `invoice_number` يحتوي على format مختلف بين `buildPreviewData` و المقارنة — لكن الكود متطابق.

**الحكم:** المطابقة تعمل عملياً لكن إضافة `id` أفضل هندسياً.

---

### فحص إضافي: InvoicesPage `onDownloadPdf` — ✅ سليم

`InvoicesPage.tsx` سطر 511-527 — عند إيجاد `origInv`، يمرر بيانات المشتري كاملة:
```typescript
contract: contract ? {
  contract_number, tenant_name, tenant_tax_number,
  tenant_street, tenant_district, tenant_city, payment_count,
} : null,
```
← `generateInvoiceClientPDF` (invoice.ts سطر 74) يمرر `tenantVatNumber` و `tenantAddress` ← **سليم**.

المشكلة محصورة في **PaymentInvoicesTab فقط**.

---

## ملخص

| # | البند | حقيقي؟ | أولوية |
|---|-------|:---:|:---:|
| M-01 | بيانات المشتري مفقودة في PDF الدفعات | ✅ حقيقي | **عالية** |
| M-02 | مطابقة الفاتورة بدون `id` | 🟡 تحسيني | منخفضة |

---

## الإصلاح المطلوب

### M-01: إضافة `tenantVatNumber` و `tenantAddress` في `handleDownloadPdf`

**ملف واحد**: `src/components/contracts/PaymentInvoicesTab.tsx` سطر 210-229

```typescript
const handleDownloadPdf = async (inv: PaymentInvoice, templateOverride?: ...) => {
  setLoadingInvoiceId(inv.id);
  try {
    const fullContract = contracts.find(c => c.id === inv.contract_id);
    const tenantAddress = [
      fullContract?.tenant_street,
      fullContract?.tenant_district,
      fullContract?.tenant_city,
    ].filter(Boolean).join('، ') || undefined;

    const blobUrl = await generatePaymentInvoicePDF({
      ...existingFields,
      tenantVatNumber: fullContract?.tenant_tax_number || undefined,
      tenantAddress,
    }, waqfInfo, templateOverride ?? invoiceTemplate);
```

### M-02 (اختياري): إضافة `id` لـ `InvoiceTemplateData` + تحسين المطابقة

- إضافة `id?: string` في `InvoiceTemplateData`
- تمريره من `buildPreviewData`
- استخدامه كمطابقة أولية في `onDownloadPdf`

