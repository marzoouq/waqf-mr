# R9 — تنظيف قاعدة البيانات (تم التنفيذ — 2026-06-22)

## 1) فهارس مكررة محذوفة (6)

| الفهرس المحذوف | الجدول | السبب | المُحتفَظ به |
|---|---|---|---|
| `idx_accounts_fiscal_year_id` | accounts | مكرر مع UNIQUE | `accounts_fiscal_year_id_unique` |
| `idx_audit_log_table_date` | audit_log | نفس الأعمدة، اتجاه ASC | `idx_audit_log_table_created` (DESC) |
| `idx_unsubscribe_tokens_token` | email_unsubscribe_tokens | مكرر مع UNIQUE | `email_unsubscribe_tokens_token_key` |
| `idx_notifications_user_read` | notifications | ASC مكرر مع DESC | `idx_notifications_user_read_created` |
| `idx_messages_conversation` | messages | ASC مكرر مع DESC | `idx_messages_conversation_created` |
| `rate_limits_key_key` (constraint) | rate_limits | UNIQUE مكرر مع PRIMARY KEY | `rate_limits_pkey` |

**ملاحظة planner**: Postgres يقرأ فهرس DESC بتكلفة مساوية لقراءة forward — لا تأثير سلبي على queries ASC.

## 2) GRANTs صريحة على 42 جدول public

طُبِّق على كل جدول:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table> TO authenticated;
GRANT ALL ON public.<table> TO service_role;
```

**النتيجة المُتحقَّق منها**: 42/42 جدول لديه:
- 4 صلاحيات لـ`authenticated` (SELECT, INSERT, UPDATE, DELETE)
- 8 صلاحيات لـ`service_role` (ALL)

**لم يُمَس `anon`**: الحفاظ على وصول landing/`app_settings`. RLS يبقى الحارس الفعلي.

## 3) التحقق

| فحص | نتيجة |
|---|---|
| الفهارس المحذوفة | 0 موجود (الستة كلها مُزالة) |
| GRANTs على 42 جدول | ✅ 42/42 |
| الاختبارات | ✅ 2125/2125 |
| Linter | 42 issue موثَّقة سابقًا في R-RESCAN-2 (security definer views/functions) — **بدون issues جديدة من R9** |

## 4) ما لم يُلمَس عمدًا

- **الفهارس الـunused (F-19..F-24)**: `idx_scan=0` على dev لا يعني عدم استخدام في prod. ترك للمراجعة المستقبلية.
- **partial indexes على contracts/payment_invoices**: مختلفة بـ`WHERE` — ليست مكررة فعليًا.
- **42 linter issue (security definer views/functions)**: مصنَّفة "ضوضاء بنيوية" في R-RESCAN-2 — تتطلب جولة منفصلة (R10) أو قرار سياسة.

## 5) المتبقي للجولة التالية (R10)

- WebAuthn HttpOnly cookie (architectural debt من R7).
- Rate-limit على `webauthn:auth-options` (W2-F14).
- مراجعة الـ42 linter issue (تحويل views إلى security_invoker حيث يمكن).
- تطوير `useCrudFactory` ليقبل `queryKeys` صراحةً + قاعدة ESLint.
