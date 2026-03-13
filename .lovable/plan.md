

# تقرير التحقق من نتائج الفحص الأمني — إثبات من قاعدة البيانات الإنتاجية

## ملخص التحقق

قمت بتنفيذ استعلام مباشر على قاعدة البيانات **الإنتاجية (Live)** باستخدام دالة PostgreSQL الأصلية `has_function_privilege()` — وهي المصدر الوحيد الموثوق لمعرفة الصلاحيات الفعلية.

## النتيجة: التقرير الأصلي كان صحيحاً

**جميع الـ 27 دالة حساسة مكشوفة فعلاً لـ `anon` في بيئة الإنتاج.**

```text
الدالة                              | anon | authenticated
------------------------------------|------|-------------
get_pii_key                         | true | true
decrypt_pii                         | true | true
encrypt_pii                         | true | true
get_beneficiary_decrypted           | true | true
lookup_by_national_id               | true | true
get_active_zatca_certificate        | true | true
close_fiscal_year                   | true | true
reopen_fiscal_year                  | true | true
execute_distribution                | true | true
pay_invoice_and_record_collection   | true | true
unpay_invoice_and_revert_collection | true | true
notify_admins                       | true | true
notify_all_beneficiaries            | true | true
cron_* (6 دوال)                     | true | true
reorder_bylaws                      | true | true
upsert_tenant_payment               | true | true
upsert_contract_allocations         | true | true
generate_all_active_invoices        | true | true
generate_contract_invoices          | true | true
get_next_icv                        | true | true
get_max_advance_amount              | true | true
```

## لماذا المراجعات (migrations) لم تحمِ الدوال

الـ REVOKE statements الموجودة في migrations السابقة **تم إلغاؤها تلقائياً** عندما أُعيد إنشاء الدوال بـ `CREATE OR REPLACE FUNCTION` في migrations لاحقة. في PostgreSQL، إعادة إنشاء الدالة تُعيد صلاحيات EXECUTE إلى الافتراضي (`PUBLIC`).

هذا يعني أن:
- الـ REVOKE في migration `20260226235240` لـ `get_pii_key` — **أُلغي** بـ migration لاحق أعاد إنشاء الدالة
- الـ REVOKE في migration `20260226235202` لـ `decrypt_pii` — **أُلغي** بنفس السبب
- وهكذا لجميع الدوال الأخرى

## خطة الإصلاح (تُضاف للخطة الحالية دون حذف أي شيء)

### المطلوب: migration واحدة تسحب الصلاحيات نهائياً

```sql
-- === سحب EXECUTE من anon و PUBLIC لجميع الدوال الحساسة ===

-- دوال التشفير (حرج جداً)
REVOKE EXECUTE ON FUNCTION public.get_pii_key() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrypt_pii(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.encrypt_pii(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_beneficiary_decrypted(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lookup_by_national_id(text) FROM anon, PUBLIC;

-- دوال ZATCA
REVOKE EXECUTE ON FUNCTION public.get_active_zatca_certificate() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_next_icv() FROM anon, PUBLIC;

-- دوال مالية
REVOKE EXECUTE ON FUNCTION public.close_fiscal_year(uuid, jsonb, numeric) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reopen_fiscal_year(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.execute_distribution(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pay_invoice_and_record_collection(uuid, numeric) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.unpay_invoice_and_revert_collection(uuid) FROM anon, PUBLIC;

-- دوال إدارية
REVOKE EXECUTE ON FUNCTION public.reorder_bylaws(jsonb) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_tenant_payment(uuid, integer, text, numeric, uuid, uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_contract_allocations(uuid, jsonb) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_all_active_invoices() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_contract_invoices(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_max_advance_amount(uuid, uuid) FROM anon, PUBLIC;

-- دوال الإشعارات
REVOKE EXECUTE ON FUNCTION public.notify_admins(text, text, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_all_beneficiaries(text, text, text, text) FROM anon, PUBLIC;

-- دوال cron
REVOKE EXECUTE ON FUNCTION public.cron_auto_expire_contracts() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cron_check_contract_expiry() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cron_check_late_payments() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cron_cleanup_old_notifications() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cron_archive_old_access_logs() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cron_update_overdue_invoices() FROM anon, PUBLIC;

-- === منح authenticated فقط ===
GRANT EXECUTE ON FUNCTION public.get_pii_key() TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_pii(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_pii(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_beneficiary_decrypted(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_zatca_certificate() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_icv() TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_fiscal_year(uuid, jsonb, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_fiscal_year(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_distribution(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pay_invoice_and_record_collection(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unpay_invoice_and_revert_collection(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_bylaws(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_tenant_payment(uuid, integer, text, numeric, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_contract_allocations(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_all_active_invoices() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_contract_invoices(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_max_advance_amount(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_admins(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_all_beneficiaries(text, text, text, text) TO authenticated;

-- lookup_by_national_id تبقى بدون GRANT لأنها تُستدعى فقط من Edge Function عبر service_role
-- cron functions تبقى بدون GRANT لأنها تُنفذ من pg_cron بصلاحيات postgres
```

### الدوال المستثناة (تبقى متاحة لـ anon عمداً)

| الدالة | السبب |
|--------|-------|
| `get_public_stats` | إحصائيات الصفحة الرئيسية العامة |
| `has_role` | مستخدمة في سياسات RLS |
| `is_fiscal_year_accessible` | مستخدمة في سياسات RLS |
| `log_access_event` | تسجيل محاولات الدخول الفاشلة |
| `check_rate_limit` | مستخدمة من guard-signup |
| Trigger functions | لا تُستدعى عبر API |

### تحديث الخطة والتوثيق

- تحديث `docs/SECURITY-KNOWLEDGE.md` بإضافة قسم "نتائج تم حلها" يوثق هذا الإصلاح
- تحديث `.lovable/plan.md` بإضافة تنبيه عن سلوك `CREATE OR REPLACE` مع GRANT/REVOKE
- إضافة تعليق في الخطة: **عند أي migration مستقبلية تستخدم `CREATE OR REPLACE FUNCTION`، يجب إعادة REVOKE/GRANT في نفس الـ migration**

### درس مستفاد (يُضاف للخطة)

> **تحذير حرج:** في PostgreSQL، أمر `CREATE OR REPLACE FUNCTION` يُعيد صلاحيات EXECUTE إلى الافتراضي (`PUBLIC`). أي REVOKE سابق يُلغى تلقائياً. الحل: يجب دائماً وضع REVOKE/GRANT في **نهاية كل migration** تُنشئ أو تُعدّل دالة حساسة.

