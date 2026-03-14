

# خطة إصلاح 10 مشاكل جديدة من الفحص الجنائي

---

## Migration 1: إصلاحات قاعدة البيانات (7 إصلاحات)

### NEW-CRIT-1 — حماية مفتاح التشفير في `lookup_by_national_id`
إعادة كتابة الدالة بإضافة فحص أن المستدعي هو `service_role` قبل قراءة المفتاح. يتم التحقق عبر `current_setting('role')` الذي يُرجع `service_role` عند الاستدعاء من Edge Function بـ service role key.

### NEW-CRIT-2 — Event Trigger يشمل `ALTER FUNCTION`
إعادة إنشاء `trg_auto_revoke_anon_execute` مع `WHEN TAG IN ('CREATE FUNCTION', 'ALTER FUNCTION')`.

### NEW-CRIT-3 — منح المحاسب SELECT على `zatca_certificates` و `invoice_chain`
إضافة سياستي SELECT صريحتين للمحاسب على الجدولين، حيث أن صفحة ZATCA تُستخدم من المحاسب فعلياً.

### NEW-HIGH-1 — إصلاح dedup في `cron_check_contract_expiry`
فصل فحص التكرار: فحص `msg` للأدمن وفحص `ben_msg` للمستفيد بشكل مستقل، بحيث لا يُتخطى إشعار المستفيد إذا كان إشعار الأدمن موجوداً.

### NEW-HIGH-2 — إضافة `WITH CHECK` لسياسة UPDATE على `support_tickets`
```sql
DROP POLICY "Users can update own open tickets" ON support_tickets;
CREATE POLICY "Users can update own open tickets"
  ON support_tickets FOR UPDATE
  USING (auth.uid() = created_by AND status = 'open')
  WITH CHECK (auth.uid() = created_by AND status = 'open');
```

### NEW-HIGH-3 — تقييد INSERT على `support_ticket_replies` للتذاكر المفتوحة فقط
إضافة شرط `AND t.status NOT IN ('closed', 'cancelled', 'resolved')` في سياسة INSERT.

### NEW-HIGH-4 — `get_next_icv()` مع قفل ذري
استخدام `SELECT ... FOR UPDATE` أو `pg_advisory_xact_lock` لمنع race condition. الحل: إدراج صف جديد في `invoice_chain` مباشرة داخل الدالة مع `RETURNING` بدلاً من SELECT ثم INSERT منفصل، أو استخدام sequence مخصص.

الحل الأمثل: تحويل `get_next_icv` لاستخدام advisory lock:
```sql
CREATE OR REPLACE FUNCTION get_next_icv()
RETURNS integer ...
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('icv_lock'));
  SELECT COALESCE(MAX(icv), 0) + 1 INTO v_next FROM invoice_chain;
  RETURN v_next;
END;
```

## Migration 2: Audit trigger لـ `support_tickets` و `support_ticket_replies` (NEW-MED-2)

```sql
CREATE TRIGGER audit_support_tickets
  AFTER INSERT OR UPDATE OR DELETE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_support_ticket_replies
  AFTER INSERT OR UPDATE OR DELETE ON public.support_ticket_replies
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
```

## المشاكل المتوسطة — قرارات معمارية

### NEW-MED-1 — `pg_cron` ازدواجي
`pg_cron` يتطلب `pg_catalog` بطبيعته في Supabase — المشكلة غير قابلة للإصلاح لأن Supabase يديرها تلقائياً. سيتم توثيق هذا كقرار معماري مقبول.

### NEW-MED-3 — `pgp_sym_encrypt` بدون schema prefix
الدوال المعنية تستخدم `SET search_path TO 'public', 'extensions'` مما يحل المشكلة. سيتم التحقق وإضافة `extensions.` prefix صريح للدوال `encrypt_pii` و `decrypt_pii` و `lookup_by_national_id` كطبقة أمان إضافية.

## الملفات المتأثرة

```text
supabase/migrations/NEW.sql
├─ CREATE OR REPLACE FUNCTION lookup_by_national_id  (+ role check)
├─ DROP + CREATE EVENT TRIGGER (+ ALTER FUNCTION)
├─ CREATE POLICY accountant SELECT on zatca_certificates
├─ CREATE POLICY accountant SELECT on invoice_chain
├─ CREATE OR REPLACE FUNCTION cron_check_contract_expiry (dedup fix)
├─ DROP + CREATE POLICY support_tickets UPDATE (+ WITH CHECK)
├─ DROP + CREATE POLICY support_ticket_replies INSERT (+ status check)
├─ CREATE OR REPLACE FUNCTION get_next_icv (+ advisory lock)
├─ CREATE TRIGGER audit_support_tickets
├─ CREATE TRIGGER audit_support_ticket_replies
└─ ALTER FUNCTION encrypt_pii/decrypt_pii (explicit schema prefix)
```

لا تغييرات على ملفات TypeScript — جميع الإصلاحات في قاعدة البيانات.

