

# التحقق من التقرير — النتائج

بعد فحص الكود الفعلي، إليك نتائج التحقق من كل نقطة:

## نتائج التحقق

| # | الادعاء | النتيجة | التفاصيل |
|---|---------|---------|----------|
| 1 | `paymentInvoice.ts` يُحفظ محلياً فقط (`doc.save`) | **مؤكد** | سطر 94: `doc.save(...)` — لا يُرفع لـ Storage ولا يوجد `file_path` في جدول `payment_invoices` |
| 2 | `PdfWaqfInfo` لا تحتوي `vatNumber` | **مؤكد** | سطر 8-13 في `core.ts`: فقط `waqfName, deedNumber, court, logoUrl` |
| 3 | لا يوجد font caching في Edge Function | **مؤكد** | سطر 223-226: `fetchFont` يُستدعى داخل `generateInvoicePdf` في كل فاتورة |
| 4 | `addHeader` لا تعرض الرقم الضريبي | **مؤكد** | سطر 88-120: فقط الاسم والصك والمحكمة والشعار |
| 5 | `generate-invoice-pdf` لا يمرر حقول ZATCA | **مؤكد** | سطر 489-496: فقط `invoice_number, invoice_type, amount, date, description, status` |
| 6 | `upsert: true` موجود | **مؤكد** | سطر 505 |
| 7 | `WaqfSettings` لا تحتوي الرقم الضريبي | **مؤكد** | سطر 193-198 |
| 8 | `PdfWaqfInfo` مستخدمة في 52 ملف | **مؤكد** | لكن معظمها `import` — التغيير في `interface` فقط يضيف حقل اختياري `vatNumber?` ولن يكسر شيئاً |
| 9 | `src/utils/pdf/invoices.ts` موجود | **مؤكد** | تقرير جدولي — يحتاج تحديث لعرض VAT |
| 10 | `generate_contract_invoices` RPC لا يقبل `vat_rate` | **مؤكد** | الكود في الـ migration لا يحتوي على هذا المعامل |

## تصحيحات مهمة على التقرير

### التقرير يبالغ في تعقيد تأثير `PdfWaqfInfo`
التقرير يقول "14 ملف PDF يحتاج تحديث" — لكن إضافة `vatNumber?: string` كحقل **اختياري** لن يكسر أي ملف. فقط الملفات التي **تحتاج عرض** الرقم الضريبي ستتغير:
- `addHeader` في `core.ts` — إضافة سطر واحد لعرض الرقم إن وُجد
- `paymentInvoice.ts` — إضافة صف VAT
- `invoices.ts` — إضافة عمود VAT

### `payment_invoices` بدون `file_path` — ثغرة حقيقية
هذه النقطة مهمة فعلاً. جدول `payment_invoices` لا يحتوي على `file_path` وفواتير المستأجرين لا تُخزّن في أي مكان. يجب إضافتها في الـ migration.

---

## الخطة المُحدّثة النهائية

بناءً على التحقق، الخطة الأصلية صحيحة مع الإضافات التالية:

### Migration (مهمة واحدة موسّعة)

```sql
-- 1. حقول VAT + ZATCA على invoices
ALTER TABLE invoices ADD COLUMN vat_rate numeric NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN vat_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN amount_excluding_vat numeric;
ALTER TABLE invoices ADD COLUMN zatca_uuid uuid DEFAULT gen_random_uuid();
ALTER TABLE invoices ADD COLUMN invoice_hash text;
ALTER TABLE invoices ADD COLUMN icv integer;
ALTER TABLE invoices ADD COLUMN zatca_status text DEFAULT 'not_submitted';
ALTER TABLE invoices ADD COLUMN zatca_xml text;

-- 2. حقول VAT + ZATCA + file_path على payment_invoices
ALTER TABLE payment_invoices ADD COLUMN vat_rate numeric NOT NULL DEFAULT 0;
ALTER TABLE payment_invoices ADD COLUMN vat_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE payment_invoices ADD COLUMN zatca_uuid uuid DEFAULT gen_random_uuid();
ALTER TABLE payment_invoices ADD COLUMN zatca_status text DEFAULT 'not_submitted';
ALTER TABLE payment_invoices ADD COLUMN file_path text;  -- ← جديد من التقرير

-- 3. جداول ZATCA
CREATE TABLE zatca_certificates (...);  -- admin-only RLS
CREATE TABLE invoice_chain (...);       -- admin-only RLS

-- 4. دالة ICV ذرية
CREATE FUNCTION get_next_icv() ...

-- 5. إعدادات ZATCA في app_settings
INSERT INTO app_settings (key, value) VALUES
  ('vat_registration_number', ''),
  ('commercial_registration_number', ''),
  ('business_address_street', ''),
  ('business_address_city', ''),
  ('business_address_postal_code', ''),
  ('default_vat_rate', '0')
ON CONFLICT (key) DO NOTHING;

-- 6. Trigger منع تعديل الفواتير بعد الإرسال لـ ZATCA
CREATE FUNCTION prevent_issued_invoice_modification() ...
CREATE TRIGGER trg_prevent_zatca_invoice_mod ...
CREATE TRIGGER trg_prevent_zatca_payment_invoice_mod ...
```

### Migration ثانية: تعديل `generate_contract_invoices` RPC
إعادة كتابة الدالة لإضافة `vat_rate` و `vat_amount` — القيمة تُقرأ من `app_settings.default_vat_rate`.

### تحديث الكود (8 مهام)

1. **تحديث `PdfWaqfInfo`** — إضافة `vatNumber?: string` (حقل اختياري — لا يكسر شيئاً)
2. **تحديث `addHeader` في `core.ts`** — عرض الرقم الضريبي تحت معلومات الصك إن وُجد
3. **تحديث `useInvoices.ts` و `usePaymentInvoices.ts`** — إضافة الحقول الجديدة للـ interfaces
4. **واجهات إدخال VAT** — Switch في `ExpenseFormDialog` و `ContractFormDialog`
5. **إعدادات ZATCA** — قسم جديد في الإعدادات (رقم ضريبي + عنوان + VAT افتراضي)
6. **تحديث `generate-invoice-pdf` Edge Function** — font caching + `upsert: false` + VAT + QR Code + ZATCA fields
7. **تحديث `paymentInvoice.ts`** — VAT شرطي + QR + رفع لـ Storage بدلاً من `doc.save`
8. **تحديث `invoices.ts`** — إضافة عمود VAT في التقرير الجدولي

### المرحلة الثانية (3 Edge Functions + واجهة)

9. **`zatca-xml-generator`** — UBL 2.1 XML + إضافة لـ `config.toml` + CORS
10. **`zatca-signer`** — ECDSA + SHA-256 chain + مفتاح خاص كـ Secret
11. **`zatca-api`** — Fatoora API (Reporting B2C + Clearance B2B)
12. **واجهة إدارة ZATCA** — حالة الامتثال + الشهادات + حالة الفواتير

### ترتيب التنفيذ

```text
Migration 1 (حقول + جداول) → Migration 2 (RPC)
  → Hooks/Interfaces → PdfWaqfInfo + addHeader
  → واجهات VAT → إعدادات ZATCA
  → Edge Function (font cache + upsert + VAT + QR)
  → paymentInvoice.ts + invoices.ts
  → Phase 2 Edge Functions → واجهة ZATCA
```

