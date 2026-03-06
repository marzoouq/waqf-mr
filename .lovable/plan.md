

# تقرير التحقق + خطة الإصلاح

## نتائج التحقق من التقرير

| # | الادعاء | النتيجة | التفاصيل |
|---|---------|---------|----------|
| 1 | `.gitignore` لا يتضمن `.env` | **صحيح** | الملف لا يحتوي على أي قاعدة لتجاهل `.env` |
| 2 | `generateQrDataUrl` لا يولّد QR حقيقي | **صحيح** | يرسم نص "QR: ZATCA" فقط — ليس QR قابل للمسح |
| 3 | `paymentInvoice.ts` يضع TLV كنص مقطوع | **صحيح** | سطر 125: `tlvBase64.substring(0, 60)...` كنص |
| 4 | Edge Function لا تحتوي QR | **صحيح** | لا يوجد أي QR code في `generate-invoice-pdf` |
| 5 | VAT Switch مفقود في نماذج الإدخال | **خاطئ** | `ExpenseFormDialog` يحتوي VAT Switch (سطر 59-72) و `ContractFormDialog` يحتوي VAT Switch (سطر 340-351) مع حساب الضريبة |
| 6 | TLV encoding خاطئ للقيم الطويلة | **صحيح جزئياً** | ZATCA spec يستخدم 1 byte للطول — مقبول لأن القيم عادة قصيرة |

## ما يحتاج إصلاح فعلي (3 بنود فقط)

### 1. `.gitignore` — إضافة `.env`
ملاحظة: في بيئة Lovable، ملف `.env` يُدار تلقائياً ولا يحتاج تعديل `.gitignore` يدوياً. لكن كإجراء وقائي، سنضيفه.

### 2. QR Code حقيقي في `zatcaQr.ts`
استبدال `generateQrDataUrl` بتوليد QR حقيقي باستخدام مكتبة `qrcode`. هذا يتطلب:
- تثبيت `qrcode` (مكتبة خفيفة لتوليد QR كـ data URL)
- إعادة كتابة `generateQrDataUrl` لاستخدام المكتبة بدلاً من canvas placeholder

### 3. دمج QR Image في PDFs
**`paymentInvoice.ts`**: استبدال النص المقطوع (سطر 122-126) بصورة QR فعلية باستخدام `doc.addImage(qrDataUrl, 'PNG', ...)`

**`generate-invoice-pdf/index.ts`**: إضافة QR code للفواتير الضريبية باستخدام TLV encoding (Deno-compatible) + تضمين الصورة في PDF عبر `pdfDoc.embedPng()`

## ترتيب التنفيذ

```text
1. تثبيت مكتبة qrcode + إصلاح zatcaQr.ts
2. تحديث paymentInvoice.ts — QR image بدل نص
3. إضافة QR في Edge Function PDF
4. تحديث .gitignore
```

## تفاصيل تقنية

### `zatcaQr.ts` — الكود الجديد
- استيراد `QRCode` من مكتبة `qrcode`
- `generateQrDataUrl(data: string)` → `QRCode.toDataURL(data, { width: 150 })` → data URL حقيقي
- الدالة `generateZatcaQrTLV` تبقى كما هي (صحيحة)

### `paymentInvoice.ts` — التغيير
- بعد توليد `tlvBase64`، استدعاء `generateQrDataUrl(tlvBase64)` للحصول على data URL
- إضافة الصورة: `doc.addImage(qrDataUrl, 'PNG', x, y, 40, 40)` (40×40mm)
- حذف النص المقطوع الحالي

### Edge Function — QR بدون مكتبة خارجية
- في Deno لا يمكن استخدام `qrcode` npm مباشرة
- الحل: استخدام `https://deno.land/x/qrcode/mod.ts` أو توليد QR عبر API خارجي بسيط
- البديل الأبسط: استخدام `npm:qrcode` في Deno (مدعوم)
- تضمين QR كـ PNG في PDF عبر `pdfDoc.embedPng(qrBytes)`

