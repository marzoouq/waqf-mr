

# إصلاح QR Code — مطابقة بيانات الفاتورة الفعلية

## المشكلة الجذرية

بعد فحص الكود، هناك مشكلتان أساسيتان:

### 1. التاريخ ليس بصيغة ISO 8601
ZATCA تشترط صيغة `2026-03-14T00:00:00Z` لكن الكود يمرر `due_date` كنص بسيط مثل `"2026-03-14"` بدون وقت. هذا يجعل QR غير متوافق مع معيار ZATCA.

```typescript
// الحالي — خطأ
timestamp: (invoice.paidDate || invoice.dueDate || new Date().toISOString())
// dueDate = "2026-03-14" ← ليس ISO 8601 كامل
```

### 2. بيانات البائع فارغة في QR
إذا لم تُملأ إعدادات الوقف (اسم الوقف، الرقم الضريبي)، يُرسل QR ببيانات فارغة:
- `sellerName: ''` ← فارغ
- `vatNumber: ''` ← فارغ

هذا يجعل QR عند المسح لا يحتوي بيانات مفيدة.

## التعديلات المطلوبة

### 1. إصلاح `renderQrCode` — `paymentInvoice.ts`
- تحويل `dueDate` لصيغة ISO 8601 كاملة: `new Date(date).toISOString()`
- استخدام بيانات الفاتورة الفعلية مع fallback واضح
- إضافة `console.log` للتحقق من بيانات QR قبل التوليد

### 2. إصلاح `generateQrDataUrl` — `zatcaQr.ts`
- زيادة حجم QR من `width: 150` إلى `width: 300` لضمان قراءة أفضل
- رفع `errorCorrectionLevel` من `'M'` إلى `'H'` (أعلى تصحيح)

### 3. إضافة validation في `PaymentInvoicesTab.tsx`
- قبل توليد PDF، التحقق من وجود بيانات الوقف الأساسية
- تنبيه المستخدم إذا كانت البيانات ناقصة (لأن QR سيكون ناقصاً)

## الملفات المتأثرة
```text
src/utils/pdf/paymentInvoice.ts   ← إصلاح timestamp + logging
src/utils/zatcaQr.ts              ← تحسين جودة QR
src/components/contracts/PaymentInvoicesTab.tsx ← validation
```

