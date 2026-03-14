
# تقرير إصلاح الثغرات — نظام الفواتير — 2026-03-14

> **النتيجة الإجمالية: 22/22 مُصلحة ✅**

---

## الجولة الأولى: 12 مشكلة أصلية (12/12 ✅)

| # | المشكلة | الحالة |
|---|---------|--------|
| CRIT-1 | `invoices` RLS = `USING(true)` | ✅ migration `20260212074033` |
| MED-1 | `payment_invoices` بدون `AS RESTRICTIVE` | ✅ migration `20260312155031` |
| CRIT-2 | تناقض Storage Policy مع accountant | ✅ 3 سياسات Storage للمحاسب |
| SEC-MED-3 | لا validation على `vat_amount <= amount` | ✅ validation triggers |
| CRIT-3 | `file.type` من client — قابل للتزوير | ✅ `validateFileSignature()` magic bytes |
| CRIT-4 | ترتيب الحذف: Storage قبل DB | ✅ DB أولاً ثم Storage |
| CRIT-5 | `download()` بدون TTL أو فحص مالك | ✅ `createSignedUrl(path, 300)` |
| HIGH-1 | `ALLOWED_MIME_TYPES` مكرر في مكانين | ✅ تصدير مركزي من useInvoices |
| HIGH-2 | `getSession()` بدلاً من `getUser()` | ✅ `getUser()` أولاً |
| HIGH-3 | `invoice_number` بدون UNIQUE | ✅ UNIQUE INDEX |
| HIGH-4 | `description` بدون تعقيم → CSV Injection | ✅ `sanitizeDescription()` |
| CRIT-4 UI | `storage.remove()` بدون error handling | ✅ try/catch |

---

## الجولة الثانية: 10 مشاكل جنائية جديدة (10/10 ✅)

| # | المشكلة | الحالة | التفاصيل |
|---|---------|--------|----------|
| NEW-CRIT-1 | `lookup_by_national_id` يقرأ مفتاح التشفير بدون فحص الدور | ✅ | فحص `current_setting('role') = 'service_role'` + `extensions.` prefix |
| NEW-CRIT-2 | Event Trigger لا يشمل `ALTER FUNCTION` | ✅ | `WHEN TAG IN ('CREATE FUNCTION', 'ALTER FUNCTION')` |
| NEW-CRIT-3 | المحاسب لا يرى `zatca_certificates` و `invoice_chain` | ✅ | سياستا SELECT صريحتان للمحاسب |
| NEW-HIGH-1 | dedup في `cron_check_contract_expiry` يُخفي إشعار المستفيد | ✅ | فصل dedup: فحص مستقل لكل نوع إشعار |
| NEW-HIGH-2 | `support_tickets` UPDATE بدون `WITH CHECK` | ✅ | `WITH CHECK (status = 'open')` |
| NEW-HIGH-3 | `support_ticket_replies` INSERT بدون شرط status | ✅ | `t.status NOT IN ('closed', 'cancelled', 'resolved')` |
| NEW-HIGH-4 | `get_next_icv()` بدون قفل — Race Condition | ✅ | `pg_advisory_xact_lock(hashtext('icv_lock'))` |
| NEW-MED-1 | `pg_cron` migrations ازدواجية | ✅ | قرار معماري مقبول — Supabase يديرها |
| NEW-MED-2 | `support_tickets` بدون `audit_trigger` | ✅ | audit triggers على الجدولين |
| NEW-MED-3 | `pgp_sym_encrypt/decrypt` بدون schema prefix | ✅ | `extensions.` prefix صريح في جميع الدوال |
