# W6 — Database (الفحص الجنائي الثاني — 2026-06-17)

30 items · 3 🔴 / 14 🟡 / 7 🟢 / 6 ✅/INFO.

## ✅ PASS
- لا جدول بلا RLS.
- لا سياسة بـ `qual='true'`.
- لا FK لـ `auth.users`.
- لا دوال volatile داخل CHECK constraints.

## 🔴 HIGH — دوال SECURITY DEFINER بلا role guard (قابلة للاستدعاء من authenticated)
- **F-01** `get_support_stats` — يكشف إحصائيات تذاكر الدعم لأي مستخدم مسجّل.
- **F-02** `get_support_analytics` — نفس المشكلة.
- **F-03** `get_total_beneficiary_percentage` — يكشف إجمالي نسب المستفيدين.

## 🟡 MEDIUM
- **F-04** `get_max_advance_amount` — بلا تحقق ownership/admin.
- **F-05** `consume_zatca_otp` — fallback يُرجع OTP plaintext إذا غاب vault key.
- **F-06** `encrypt_zatca_otp_setting` — trigger fn ممنوحة EXECUTE لـ authenticated.
- **F-07..F-16** فهارس مكررة على 10 جداول (notifications, audit_log, accounts, messages, rate_limits, payment_invoices, email_send_log, suppressed_emails, email_unsubscribe_tokens, contracts) → هدر write I/O.
- **F-17** 42 جدول بلا GRANT صريح (يعتمد على RLS فقط — لا defence-in-depth).
- **F-18** `cron_check_late_payments` — guard يفشل عند `auth.uid() IS NULL`.
- **F-27** `disbursement_vouchers_public` بلا `security_barrier=true`.

## 🟢 LOW — فهارس غير مستخدمة (idx_scan=0)
F-19..F-24 على contracts/payment_invoices/invoices/messages/webauthn_challenges/zatca_operation_log.

## INFO
- F-25 GIST exclude constraint scan=0 طبيعي.
- F-26 `beneficiaries_safe` يستخدم `security_invoker=on` + `security_barrier` — صحيح.
- F-28 trigger مكرّر على `zatca_certificates` معالج في R4.

## أسئلة مفتوحة
- هل `get_support_stats/analytics` يُستدعى من Edge مع role check خارجي؟ إذا لا → استغلال فوري.
- `vault.decrypted_secrets WHERE name='pii_encryption_key'` يجب التأكد منه = 1.
