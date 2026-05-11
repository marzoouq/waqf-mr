# API Integration Reference

تنظّم هذه الوثيقة كل استدعاءات الـ RPC وEdge Functions المستخدمة في الواجهة، مع
سياسة retry/cache/throttle لكل فئة.

## طبقة `rpc()` الموحّدة (`src/lib/api/rpc.ts`)

كل استدعاءات `supabase.rpc()` يجب أن تمر عبر `rpc()` للحصول على:

- توقيت أداء تلقائي (يُسجَّل في `queryMonitor`).
- تصنيف أخطاء موحّد عبر `classifyError()` ⇒ `ApiError` بفئة واضحة.
- إعادة محاولة تلقائية مع exponential backoff للفئات المؤقتة فقط.

### فئات الأخطاء وسياسة إعادة المحاولة

| الفئة | المصدر | إعادة محاولة؟ | السلوك |
|-------|--------|---------------|--------|
| `auth` | HTTP 401/403 | لا | يُترك لـ `AuthContext` |
| `permission` | Postgres `42501` | لا | يُعرض كخطأ صلاحيات |
| `validation` | 400 / `22xxx` / `23xxx` | لا | يُعرض رسالة الخطأ |
| `rate_limit` | HTTP 429 | نعم (3 محاولات) | backoff 250→500→1000ms |
| `network` | `TypeError: fetch failed` | نعم | backoff |
| `server` | HTTP 5xx | نعم | backoff |
| `unknown` | غير ذلك | لا | يُسجَّل في logger |

## ثوابت `staleTime`

| الثابت | المدة | الاستخدام |
|--------|------|-----------|
| `STALE_LIVE` | 15s | محادثات realtime |
| `STALE_DASHBOARD` | 30s | لوحات قيادة |
| `STALE_MESSAGING` | 30s | رسائل/تذاكر |
| `STALE_FINANCIAL` | 60s | الافتراضي للبيانات المالية |
| `STALE_REALTIME` | 60s | بيانات حساسة للوقت |
| `STALE_STATIC` | 5min | عقارات/وحدات/لوائح |
| `STALE_PUBLIC` | 5min | إحصائيات صفحة الهبوط |
| `STALE_REFERENCE` | 15min | الأدوار/الإعدادات الجامدة |

## RPC Functions الرئيسية

| الدالة | الدور | المعاملات | الاستجابة | فئة الخطأ المعتادة |
|--------|------|-----------|-----------|---------------------|
| `get_public_stats` | anon, authenticated | — | `jsonb { stats: [...] }` | — |
| `log_access_event` | anon, authenticated | event_type, email?, user_id?, target_path?, device_info?, metadata? | `void` | — |
| `get_dashboard_kpis` | authenticated (admin/accountant) | `p_year` | `jsonb` | permission إذا غير مصرّح |
| `get_dashboard_full_summary` | authenticated | `p_year` | `jsonb` | — |
| `get_beneficiary_dashboard` | beneficiary | `p_year` | `jsonb` | — |
| `pay_invoice_and_record_collection` | admin/accountant | `p_invoice_id`, `p_amount`, `p_payment_date` | `uuid` | validation عند fiscal year مغلق |
| `execute_distribution` | admin | `p_year_id` | `jsonb` | permission/validation |
| `close_fiscal_year` | admin | `p_year_id` | `jsonb` | validation عند فشل الإقفال |
| `reopen_fiscal_year` | admin | `p_year_id` | `jsonb` | — |

> القائمة الكاملة لدوال `SECURITY DEFINER` المسموح استدعاؤها من المستخدمين موجودة في
> `docs/security/security-definer-allowlist.md`.

## الدوال العامة (anon-callable)

تحمل وسم `[anon-callable]` في `COMMENT ON FUNCTION` ويحترمها الـ event trigger
`auto_revoke_anon_execute` عند إعادة الإنشاء:

- `get_public_stats()` — إحصائيات صفحة الهبوط للزوار.
- `log_access_event(...)` — تسجيل أحداث وأخطاء قبل تسجيل الدخول.

أي إضافة جديدة لدالة anon-callable تتطلب:

1. `COMMENT ON FUNCTION <name> IS '[anon-callable] <reason>';`
2. `GRANT EXECUTE ON FUNCTION <name> TO anon, authenticated;`
3. إضافتها إلى `ALLOWLIST_ANON` في `scripts/supabase-lint-check.mjs`.
4. توثيقها هنا و في `docs/security/security-definer-allowlist.md`.

## Edge Functions

راجع `docs/api/edge-functions.md` للتفاصيل (origins، الرؤوس، نمط المصادقة).

## مراقبة الأداء

عبر `startPerfTimer()` في `src/lib/monitoring/queryMonitor.ts`:

- `> 2000ms` ⇒ `logger.warn`
- `> 5000ms` ⇒ `logger.error` + يدخل قائمة أبطأ 50 استعلام.

## Throttle لـ `errorReporter`

`reportClientError()` يُطبّق dedupe بمفتاح `error_name + url` خلال نافذة 5 ثوانٍ
لمنع تكرار نفس الخطأ في حلقات الفشل.
