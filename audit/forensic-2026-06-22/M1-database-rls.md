# M1 — قاعدة البيانات و RLS (Forensic 2026-06-22)

تاريخ: 2026-06-22 22:58 UTC | البيئة: Live (production)

## 1) ملخص

| المؤشر | القيمة |
|--------|--------|
| إجمالي ملاحظات `supabase--linter` | **184** |
| إجمالي ملاحظات `security--run_security_scan` | **185** |
| جداول `public` بدون RLS مفعّل | **0** ✓ |
| جداول `public` بـ RLS لكن بدون أي policy | **0** ✓ |
| دوال `SECURITY DEFINER` بدون `set search_path` | **0** ✓ |
| FK بدون فهرس مساند | **0** ✓ |
| دوال `SECURITY DEFINER` قابلة للتنفيذ من `anon`/`public` | **~70 دالة (كل دوال public)** ⚠️ |
| Storage buckets عامة | `waqf-assets` (مقصود) |
| Views بـ `security_invoker=off` | `contracts_safe` (مقصود — موثّق في memory) |

## 2) ملاحظات حرجة (Critical)

### C1 — سياسة storage عامة على `invoices` bucket (تأكيد إيجابي حقيقي)
- **الموقع:** `storage.objects` policy `Authenticated users can view invoices`
- **النص:** `cmd=SELECT, qual=(bucket_id='invoices' AND auth.role()='authenticated')`
- **الدليل:** استعلام مباشر على `pg_policies` يُرجع الصف:
  ```
  policyname: Authenticated users can view invoices
  cmd       : SELECT
  qual      : (bucket_id = 'invoices'::text) AND (auth.role() = 'authenticated'::text)
  ```
- **الأثر:** أي مستخدم مسجّل (بما فيهم beneficiary/waqif غير المخوّلين) يستطيع تنزيل/سرد كل ملفات الفواتير عبر signed/public URL على الـ bucket، لأن RLS permissive ⇒ أي policy true تُمرّر.
- **ملاحظة:** ينقض ادعاء `R11-VERIFICATION.md` (الذي قال إن السياسة "غير مُنشرة"). السياسة **موجودة فعلاً** على Live.
- **التوصية:** `DROP POLICY "Authenticated users can view invoices" ON storage.objects;` والاكتفاء بـ `Role-based users can view invoices` التي تتحقق من الأدوار المعنية.

### C2 — سياسات INSERT على `storage.objects` بلا `with_check`
- **الموقع:** `Accountants can upload invoices`, `Admins can upload invoices`, `Admins can upload waqf assets`
- **الدليل:** `qual=NULL` و `with_check=NULL` ⇒ سياسة INSERT بلا قيد ⇒ ترفع لأي مسجَّل في أي bucket.
- **الأثر:** أي مستخدم authenticated يستطيع رفع ملفات إلى أي bucket باسمه. (تخفيف: لا يكسر السرية لكن يفتح storage abuse).
- **التوصية:** إضافة `WITH CHECK (bucket_id = 'invoices'::text AND has_role(auth.uid(),'accountant'))` ونظائرها.

### C3 — كل دوال `SECURITY DEFINER` العامة قابلة للتنفيذ من `anon`
- **العدد:** ≥70 دالة في `public.*` (شامل `decrypt_pii`, `get_pii_key`, `encrypt_zatca_private_key`, `consume_zatca_otp`, `delete_fiscal_year_cascade`, `close_fiscal_year`, ...)
- **الدليل:** `has_function_privilege('anon', oid, 'EXECUTE') = true` لجميع SECURITY DEFINER في `public`.
- **الأثر:** بعض الدوال (مثل `decrypt_pii`, `get_pii_key`, `encrypt_zatca_private_key`) كان يجب أن تكون محصورة على `service_role` فقط. حتى لو RLS داخل الدالة تمنع، فالكشف عن سطح هجوم.
- **التوصية:** `REVOKE EXECUTE ON FUNCTION public.<fn> FROM PUBLIC, anon;` ثم GRANT صريح لـ `authenticated`/`service_role` حسب الحاجة. Trigger `auto_revoke_anon_execute` موجود لكنه لا يعمل على الكل — يجب تشغيله أو مراجعة شرطه.

## 3) ملاحظات عالية (High)

### H1 — تعدد سياسات SELECT متراكبة على `invoices` bucket (هدر ومخاطرة)
- 4 سياسات SELECT منفصلة على نفس bucket: `Authenticated users can view invoices` (C1 أعلاه)، `Admin and accountant can view invoice files`، `Admin and accountant can view invoices`، `Admins can read invoices`، `Accountants can read invoices`، `Role-based users can view invoices`.
- بعضها مكرر تماماً (مثل "view invoice files" و "view invoices"). تنظيف يخفّض سطح الأخطاء.

### H2 — `1,162,697` معاملة مرتدة منذ آخر تشغيل
- من `supabase--db_health`. مؤشر على trigger/constraint يفشل بشكل متكرر أو client يحاول كتابة محظورة بـ RLS.
- **التوصية:** فعّل `log_lock_waits` و راقب `pg_stat_database.xact_rollback` لتحديد المصدر.

### H3 — بعض السياسات تعتمد `auth.role()='service_role'` بدل التحقق من JWT
- 6 سياسات: على `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `suppressed_emails`.
- مقبول لأن service_role يأتي من Edge Functions فقط؛ لكن أفضل ممارسة هي الاعتماد على grants بدل سياسات (أو إضافة `OR has_role(...)`).

## 4) ملاحظات متوسطة (Medium)

### M1 — `disk` 60% + `memory` 59% + `WAL` 240MB
- مساحة قاعدة البيانات 4.26GB. التوسع متاح لكن يجب مراقبة `access_log_archive` و `audit_log` (autovacuum thresholds).

### M2 — `waqf-assets` bucket عام + سياسة "Anyone can view"
- مقصود ومُوثَّق في memory (يُستخدم لقوالب PDF/Email). يُنصح بإضافة `Cache-Control` و prefix `public/` لتقييد ما يُكشف.

### M3 — تعدد آليات لإخفاء PII
- `contracts_safe` (security_invoker=off — مقصود)
- `beneficiaries_safe` (security_invoker=on)
- `zatca_certificates_safe` (security_invoker=on)
- اختلاف الأسلوب يجعل المراجعة أصعب. وثّق نمطاً واحداً معتمداً.

## 5) ملاحظات منخفضة (Low / Info)

- `disbursement_vouchers_public` view + سياسة `Beneficiary and waqif read approved vouchers` تتحقق من `app_settings('voucher_pdf_beneficiary_access')='true'` — معطّل افتراضياً ✓.
- `enforce_single_active_fy` trigger موجود — منع وجود سنتين ماليتين مفتوحتين ✓.
- 365 migration بدون تعارض ظاهر (لم يُكتشف خطأ DDL خلال الاستعلامات).

## 6) ما تم التحقق منه ولم تُكتشف فيه مخالفات

| فحص | النتيجة |
|-----|---------|
| RLS مفعّل على كل جداول `public` | ✓ |
| كل جدول لديه ≥1 policy | ✓ |
| كل SECURITY DEFINER لديه `set search_path` | ✓ |
| كل FK لديه index | ✓ |
| لا تخزين أدوار خارج `user_roles` | ✓ |
| `has_role()` يُستخدم في policies | ✓ |
| `contracts_safe` بـ security_invoker=off (مقصود) | ✓ |
| `invoices` bucket = private | ✓ (لكن C1 يجعله بحكم العام) |
| `disbursement-vouchers` bucket = private | ✓ |

## 7) الأولويات

1. **فوراً:** C1 (إسقاط سياسة `Authenticated users can view invoices`)
2. **خلال يوم:** C2 (إضافة `WITH CHECK` للسياسات INSERT)
3. **خلال أسبوع:** C3 (مراجعة EXECUTE لكل SECURITY DEFINER + تشغيل `auto_revoke_anon_execute`)
4. **متابعة:** H2 (تتبّع مصدر rolled-back transactions)
5. **تنظيف:** H1, M3 (توحيد سياسات storage و views آمنة)
