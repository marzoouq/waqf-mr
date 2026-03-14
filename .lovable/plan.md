

# خطة إصلاح 10 ثغرات مفتوحة في نظام الفواتير

## ملخص الحالة
من أصل 12 مشكلة، تم إصلاح 2 فقط. هذه الخطة تعالج الـ 10 المتبقية.

---

## الإصلاحات

### Migration 1: Storage Policy + VAT Constraints + UNIQUE invoice_number

**CRIT-2**: إضافة `accountant` لسياسة رفع الملفات في `storage.objects` لـ bucket `invoices`.

**SEC-MED-3**: إضافة validation trigger (ليس CHECK constraint) للتحقق من:
- `vat_amount <= amount`
- `vat_rate BETWEEN 0 AND 100`

**HIGH-3**: إضافة `UNIQUE(invoice_number, fiscal_year_id)` على جدول `invoices` مع استثناء NULL.

```sql
-- CRIT-2: accountant storage access
CREATE POLICY "Accountants can upload invoices"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'invoices' AND has_role(auth.uid(), 'accountant'::app_role));

-- SEC-MED-3: VAT validation trigger
CREATE FUNCTION validate_payment_invoice_vat() ...
  IF NEW.vat_amount > NEW.amount → RAISE EXCEPTION
  IF NEW.vat_rate NOT BETWEEN 0 AND 100 → RAISE EXCEPTION

-- HIGH-3: unique invoice number per fiscal year
CREATE UNIQUE INDEX invoices_number_fy_unique
ON invoices (invoice_number, fiscal_year_id)
WHERE invoice_number IS NOT NULL;
```

### ملف: `src/hooks/useInvoices.ts` (5 إصلاحات)

**CRIT-3** — Magic bytes validation: إضافة دالة `validateFileSignature()` تقرأ أول 4-8 بايتات من الملف وتتحقق من التوقيع الفعلي (PDF: `%PDF`, PNG: `89504E47`, JPEG: `FFD8FF`, WebP: `52494646...57454250`). تُستدعى في `uploadInvoiceFile` بعد فحص الامتداد.

**CRIT-4** — ترتيب الحذف: عكس الترتيب ليصبح DB أولاً ثم Storage. إذا فشل حذف DB → الملف يبقى. إذا نجح حذف DB وفشل Storage → تسجيل تحذير فقط.

**CRIT-5** — استبدال `download()` بـ `createSignedUrl()` مع TTL = 300 ثانية + فحص `filePath` ضد path traversal.

**HIGH-2** — استبدال `getSession()` بـ `getUser()` في `useGenerateInvoicePdf`.

**HIGH-1** — تصدير `ALLOWED_MIME_TYPES` و`MAX_FILE_SIZE` و`VALID_EXTENSIONS` لإعادة استخدامها.

### ملف: `src/pages/dashboard/InvoicesPage.tsx` (2 إصلاح)

**HIGH-1** — حذف التعريف المكرر لـ `ALLOWED_MIME_TYPES` و`MAX_FILE_SIZE` واستيرادهما من `useInvoices.ts`.

**HIGH-4** — تعقيم `formData.description` ضد CSV Injection: إزالة الأحرف `=`, `+`, `-`, `@`, `\t`, `\r` من بداية النص قبل الإرسال.

### التفاصيل التقنية

```text
src/hooks/useInvoices.ts
├─ export ALLOWED_MIME_TYPES, MAX_FILE_SIZE, VALID_EXTENSIONS
├─ + validateFileSignature(file): Promise<boolean>  ← magic bytes
├─ uploadInvoiceFile: await validateFileSignature() after ext check
├─ useDeleteInvoice: DB first → then storage (try/catch)
├─ getInvoiceSignedUrl: createSignedUrl(path, 300) + path validation
└─ useGenerateInvoicePdf: getUser() instead of getSession()

src/pages/dashboard/InvoicesPage.tsx
├─ import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from useInvoices
├─ remove local ALLOWED_MIME_TYPES / MAX_FILE_SIZE
└─ sanitizeDescription() before submit

supabase/migrations/xxx.sql
├─ CREATE POLICY accountant upload on storage.objects
├─ CREATE FUNCTION + TRIGGER validate_payment_invoice_vat
└─ CREATE UNIQUE INDEX invoices_number_fy_unique
```

