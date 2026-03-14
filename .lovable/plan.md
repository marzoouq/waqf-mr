
# تقرير إصلاح 10 ثغرات في نظام الفواتير — 2026-03-14

> **النتيجة: 12/12 مُصلحة ✅**

---

## ملخص الإصلاحات

| # | المشكلة | الحالة | التفاصيل |
|---|---------|--------|----------|
| CRIT-1 | `invoices` RLS = `USING(true)` | ✅ مُصلح سابقاً | migration `20260212074033` |
| MED-1 | `payment_invoices` بدون `AS RESTRICTIVE` | ✅ مُصلح سابقاً | migration `20260312155031` |
| CRIT-2 | تناقض Storage Policy مع accountant | ✅ مُصلح | أُضيفت 3 سياسات Storage للمحاسب (INSERT/SELECT/DELETE) |
| SEC-MED-3 | لا validation على `vat_amount <= amount` | ✅ مُصلح | validation triggers على `invoices` + `payment_invoices` |
| CRIT-3 | `file.type` من client — قابل للتزوير | ✅ مُصلح | `validateFileSignature()` magic bytes validation |
| CRIT-4 | ترتيب الحذف: Storage قبل DB | ✅ مُصلح | DB أولاً ثم Storage مع try/catch |
| CRIT-5 | `download()` بدون TTL أو فحص مالك | ✅ مُصلح | `createSignedUrl(path, 300)` + path traversal check |
| HIGH-1 | `ALLOWED_MIME_TYPES` مكرر في مكانين | ✅ مُصلح | تصدير من useInvoices + استيراد في InvoicesPage |
| HIGH-2 | `getSession()` بدلاً من `getUser()` | ✅ مُصلح | `getUser()` أولاً ثم `getSession()` للـ token فقط |
| HIGH-3 | `invoice_number` بدون UNIQUE | ✅ مُصلح | `UNIQUE INDEX (invoice_number, fiscal_year_id) WHERE NOT NULL` |
| HIGH-4 | `description` بدون تعقيم → CSV Injection | ✅ مُصلح | `sanitizeDescription()` يزيل `=+\-@\t\r` من البداية |
| CRIT-4 UI | `storage.remove()` بدون error handling | ✅ مُصلح سابقاً | try/catch موجود في InvoicesPage |
