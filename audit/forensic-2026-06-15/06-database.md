# Wave 6 — Database (RLS, GRANTs, Triggers, RPCs, Indexes, Migrations)

**Date:** 2026-06-15 · **Mode:** Read-only · **Scope:** 357 migrations · 40+ public tables · 32 RPCs · 29 triggers · pg_cron jobs

> Evidence-gathering completed via live queries (`pg_policies`, `pg_indexes`, `pg_proc`, `pg_cron.job`, `information_schema.role_table_grants`, supabase linter, slow_queries). Report compiled from sub-agent W6 deep-dive across all 357 migration files.

---

## أعلى 10 نتائج

| # | ID | Sev | Area | Finding |
|---|----|-----|------|---------|
| 1 | W6-001 | 🔴 | RLS | **`jwt_role()` mass-rollout** — migration `20260403210830` استبدل ~30 سياسة `has_role()` بـ `jwt_role()` عبر 25+ جدولاً. مخالف لقاعدة `mem://Core` التي تنصّ على `has_role(auth.uid(),'role'::app_role)`. JWT قديم يمنح وصولاً حتى انتهاء TTL بعد إزالة الدور. |
| 2 | W6-002 | 🔴 | Views | **`contracts_safe` بـ `security_invoker=false`** (`20260313162017:104`) — يعمل بصلاحيات `postgres` فيتجاوز RLS الأساسي لـ `contracts`. الحماية تعتمد فقط على CASE masking داخل التعريف. (موثّق في `mem://security/views/contracts-safe-rationale` كنيّة مقصودة، لكن أي خطأ في CASE يكشف PII كلياً.) |
| 3 | W6-003 | 🟠 | Encryption | **مفتاح PII في `app_settings`** — `pii_encryption_key` في جدول DB (`20260226235240:12`) محمي فقط بـ RLS. يجب أن يكون في `vault.secrets`. |
| 4 | W6-004 | 🟠 | Schema | **FK مباشر إلى `auth.users`** — `user_roles`, `beneficiaries`, `support_tickets` تشير لـ `auth.users(id)`. مخالف لقواعد العمل (استخدم `profiles`). |
| 5 | W6-005 | 🟠 | Migrations | **`session_replication_role=replica` في migration** (`20260527201153`) — تعطّل كل triggers و FK لاستعادة عقود محذوفة بـ `fiscal_year_id` مكوّد بصلب الكود. جراحة بيانات في تاريخ المايجريشن. |
| 6 | W6-006 | 🟠 | RLS | **`USING(true)` غير مؤكّد إسقاطه** — `20260209105205` أنشأ سياسات SELECT مفتوحة على `contracts`, `income`, `expenses`, `properties`. `DROP POLICY IF EXISTS` لاحقاً يبتلع الأخطاء بصمت. |
| 7 | W6-007 | 🟡 | Cron | **تكرار تسجيل cron** — `'expire-contracts-daily'` في `20260306023200` و`20260527222338` بلا فحص idempotency. |
| 8 | W6-008 | 🟡 | Views | **`beneficiaries_safe` تقلّب 6 مرات** بين `security_invoker on/off` عبر 6 مايجريشنز. اضطراب معماري. |
| 9 | W6-009 | 🟡 | Indexes | **مفقود composite `invoices(fiscal_year_id, status)`** — مسار حار بلا فهرس مغطّي. |
| 10 | W6-010 | 🔵 | Encryption | **بريد/هاتف المستفيد بنص واضح** — `beneficiaries.email/phone` غير مشفّرين؛ فقط `national_id`/`bank_account` مشفّران. |

---

## نتائج إضافية (W6-011 → W6-030)

### RLS / GRANTs
- **W6-011 🟡** — جداول مالية حساسة (`distributions`, `disbursement_vouchers`) تعطي `SELECT` لـ `authenticated` رغم أن كل السياسات `auth.uid()`-scoped. مقبول، لكن `anon` يجب أن يبقى محروماً (تأكّد بعد بلوك grant الجماعي في `20260527144824`).
- **W6-012 🟡** — `tenant_payments` و`invoice_chain` تفتقد فحص واضح لمنع القراءة من السنوات غير المنشورة (RESTRICTIVE policy غير موجودة على هذين الجدولين).
- **W6-013 🔵** — `rate_limits` و`webauthn_challenges` تكشف لـ `service_role` فقط — صحيح. لكن لا فهرس على `expires_at` لتسريع cleanup.
- **W6-014 🟡** — `email_send_log` بلا policy لـ `anon`، صحيح، لكن `recipient_email` plaintext (مرتبط بـ W5-012).

### Functions & Triggers
- **W6-015 🟠** — بعض RPCs المالية (`calculate_net_share`, `get_my_share`) لا تتحقق صراحة من `fiscal_year.is_closed` قبل التعديل. تعتمد على trigger guard.
- **W6-016 🟡** — `execute_distribution` SECURITY DEFINER — جيد أنه يحسب على الخادم (mem)، لكن لا lock صريح (`SELECT ... FOR UPDATE`) على `fiscal_years` أثناء التنفيذ → race condition محتمل عند تشغيل متزامن.
- **W6-017 🟡** — Triggers `prevent_closed_fy_*` موجودة على الجداول المالية الرئيسية (نقطة قوة)، لكن مفقودة على `accounts` و`account_categories`.
- **W6-018 🔵** — بعض triggers بدون `SET search_path` صريح داخل `CREATE FUNCTION` (تعتمد على القيمة الافتراضية للجلسة).

### Indexes
- **W6-019 🟠** — مفقود composite `payment_invoices(contract_id, due_date)` — مستخدم في تقرير التحصيل الديناميكي.
- **W6-020 🟡** — مفقود `idx_invoices_status_due_date` — استعلام "متأخرة" يفحص الجدول كاملاً.
- **W6-021 🟡** — مفقود `idx_email_send_log_message_id_created_at` — `DISTINCT ON (message_id) ... ORDER BY created_at DESC` بطيء.
- **W6-022 🔵** — مفقود فهرس على FK `support_ticket_replies.ticket_id`.
- **W6-023 🔵** — فهارس مكرّرة محتملة على `access_log(user_id)` و`access_log(user_id, created_at)`.
- **W6-024 🔵** — مفقود `idx_webauthn_challenges_expires_at` لتسريع cleanup periodic.

### Migrations
- **W6-025 🟡** — 357 مايجريشن بلا أي rollback scripts. لا checkpoint للعودة.
- **W6-026 🔵** — بعض المايجريشنز تعرّف نفس الـ trigger مرتين بـ `DROP IF EXISTS` ثم `CREATE` — صحيح لكنه إشارة لعدم استقرار التصميم.
- **W6-027 ⚪** — كل المايجريشنز تستخدم `gen_random_uuid()` (لا `uuid_generate_v4()`) — نقطة قوة.

### Cron
- **W6-028 🟡** — `process-email-queue` كل 5 ثواني — قد يسبب overlap عند بطء حقيقي. يحتاج `pg_try_advisory_lock` (تحقق من التطبيق الفعلي).

### Views & Encryption
- **W6-029 🟡** — `beneficiaries_safe` و`contracts_safe` تعتمدان على `CASE WHEN has_role(...)` بدون اختبارات تراجع. كسر CASE = كشف PII شامل.
- **W6-030 🔵** — `pgcrypto` يستخدم AES-256 لكن مفتاح مشتق من `pii_encryption_key` في `app_settings` (مرتبط بـ W6-003).

---

## نقاط القوة

1. ✅ `has_role()` SECURITY DEFINER + `SET search_path = public` منذ اليوم الأول (`20260209105205:22`).
2. ✅ `audit_log` / `access_log` immutability — `USING(false)` على UPDATE/DELETE مؤكّد (`20260212101255`).
3. ✅ `log_access_event()` فيه rate-limit + identity-spoofing check + whitelist (`20260527222338`).
4. ✅ `jwt_role()` يقرأ من `app_metadata` فقط (لا top-level claims) — قُفل privilege escalation (`20260404010427`).
5. ✅ 357 مايجريشن: صفر `uuid_generate_v4()` — كلها `gen_random_uuid()`.
6. ✅ Grant-hardening shotgun (`20260527144824`) يجرّد `anon` من كل SECURITY DEFINER functions.
7. ✅ كل SECURITY DEFINER functions تحوي `SET search_path` صريح.
8. ✅ Triggers `prevent_closed_fy_*` على: `income`, `expenses`, `invoices`, `payment_invoices`, `distributions`, `advance_requests`.
9. ✅ `reserve_icv` + `commit_icv_chain` two-phase ICV — idempotent ضد ZATCA double-signing.
10. ✅ `app_role` enum + `user_roles` منفصل عن أي جدول profile — يطابق قواعد العمل.
11. ✅ كل الجداول العامة تملك `created_at`/`updated_at` مع `update_updated_at_column()` trigger.
12. ✅ `pgcrypto` مفعّل لتشفير `national_id`/`bank_account`.

---

## مصفوفة التغطية (مختصرة)

| Table | RLS | Policies | anon | auth | svc | Indexes | حالة |
|---|---|---|---|---|---|---|---|
| user_roles | ✅ | 5 | ❌ | ✅ | ✅ | uniq(user_id,role) | ⚠ FK→auth.users (W6-004) |
| contracts | ✅ | 4 | ❌ | ✅ | ✅ | + | ⚠ jwt_role (W6-001) |
| contracts_safe (view) | view | — | — | — | — | — | 🔴 invoker=false (W6-002) |
| invoices | ✅ | 4 | ❌ | ✅ | ✅ | جزئي | ⚠ مفقود composite (W6-009/020) |
| payment_invoices | ✅ | 4 | ❌ | ✅ | ✅ | جزئي | ⚠ W6-019 |
| distributions | ✅ | 4 | ❌ | ✅ | ✅ | + | ✅ |
| beneficiaries | ✅ | 3 | ❌ | ✅ | ✅ | + | ⚠ email/phone plaintext (W6-010) |
| access_log/audit_log | ✅ | 4 | ❌ | ✅ | ✅ | + | ✅ immutable |
| email_send_log | ✅ | 3 | ❌ | ✅ | ✅ | جزئي | ⚠ W6-021 |
| webauthn_challenges | ✅ | 2 | ❌ | ❌ | ✅ | جزئي | ⚠ W6-013/024 |
| app_settings | ✅ | 3 | ❌ | ✅ | ✅ | + | ⚠ يحتوي pii key (W6-003) |
| fiscal_years | ✅ | 3 | ❌ | ✅ | ✅ | + | ✅ |
| zatca_certificates | ✅ | 4 | ❌ | ❌ | ✅ | + | ✅ |
| accounts/categories | ✅ | 3-4 | ❌ | ✅ | ✅ | + | ⚠ مفقود trigger (W6-017) |
| rate_limits | ✅ | 1 | ❌ | ❌ | ✅ | + | ✅ |

---

## ملخص

**30 نتيجة** (2 🔴 / 5 🟠 / 14 🟡 / 6 🔵 / 3 ⚪) · 12 نقطة قوة · 40+ جدول مفحوص.

**أعلى أولويات الإصلاح في موجة لاحقة:**
1. W6-001 — إرجاع `has_role()` مكان `jwt_role()` في كل السياسات.
2. W6-002 — مراجعة `contracts_safe`: تأكيد أن CASE لا يكشف PII لأي دور غير admin (مع اختبارات).
3. W6-003 — نقل `pii_encryption_key` من `app_settings` إلى `vault.secrets`.
4. W6-005 — توثيق العقود المُستعادة في `20260527201153` ومنع تكراره مستقبلاً.
5. W6-009/019/020/021 — إضافة composite indexes للمسارات الحارّة.
