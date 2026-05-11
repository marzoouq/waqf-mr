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

## طبقة `invoke()` الموحّدة (`src/lib/api/invoke.ts`)

كل استدعاءات `supabase.functions.invoke()` يجب أن تمر عبر `invoke()` للحصول على
نفس فوائد `rpc()` (توقيت + تصنيف خطأ + retry/backoff + مراقبة الحمولة).

### التوقيع

```ts
invoke<T>(
  fnName: string,
  request?: { body?: unknown; headers?: Record<string,string>; signal?: AbortSignal },
  options?: {
    maxAttempts?: number;             // الافتراضي 3
    label?: string;                    // perf-timer label
    onAuthError?: (e: ApiError) => void | Promise<void>;
    treatDataErrorAsFailure?: boolean; // الافتراضي true — يحوّل { error: '...' } إلى ApiError
  },
): Promise<T>
```

### حالات استخدام مرجعية

| الحالة | الإعداد |
|--------|--------|
| Edge Function عاديّة | `await invoke('fn', { body })` |
| تسجيل خروج عند 401 | `{ onAuthError: () => supabase.auth.signOut() }` |
| تحديات حسّاسة (WebAuthn) | `{ maxAttempts: 1, treatDataErrorAsFailure: false }` |
| Edge Function ترجِع `{ error: ... }` بدلاً من 4xx | يُعالَج تلقائياً (الافتراضي) |
| الوصول للحقول الإضافية في الخطأ | `catch (e) { (e as ApiError).cause }` |

## مراقبة حجم الحمولة (DEV)

`src/lib/monitoring/payloadMonitor.ts` يُستدعى تلقائياً من `rpc()` و `invoke()`:

| الحجم | السلوك |
|-------|--------|
| > 500 KB | `logger.warn` |
| > 1 MB | `logger.error` |

يعمل في `import.meta.env.DEV` فقط لتفادي تكلفة `JSON.stringify` في الإنتاج.

## اختبارات failure paths

- `src/lib/api/rpc.test.ts` — 9 سيناريوهات (success, auth, permission, validation, rate-limit×3, network, server, retry/backoff مع `vi.useFakeTimers`).
- `src/lib/api/invoke.test.ts` — 8 سيناريوهات (success, auth + `onAuthError`, validation, rate-limit×3, network, server, `data.error` fallback, `treatDataErrorAsFailure: false`).

## Retry & Rate-limit Policy (موحّدة)

| فئة المسار | `maxAttempts` | `treatDataErrorAsFailure` | السلوك عند 429 |
|---|---|---|---|
| auth-sensitive (`lookup-national-id`, `guard-signup`, WebAuthn challenges) | **1** | `false` | يقرأ `data.retry_after`/`data.remaining` ويعرض رسالة بدون retry |
| ZATCA onboard / renew (تحديات مرة واحدة) | **1** | افتراضي | لا retry — تفشل بصراحة |
| Edge Functions تشغيلية عادية (`dashboard-summary`, `generate-invoice-pdf`, `email-admin`، إلخ) | **3** افتراضي | افتراضي | retry مع backoff 250→500→1000ms للفئات `network/server/rate_limit` |
| RPCs قراءة | **3** افتراضي | غ.م | retry مع backoff |
| RPCs mutation حسّاسة (`execute_distribution`, `close_fiscal_year`) | **3** افتراضي | غ.م | retry مع backoff (الدوال idempotent على مستوى السنة) |
| fire-and-forget (`notificationService.notifyUser`) | **0** (لا غلاف) | غ.م | لا retry بالتصميم — لا يحجب UX |
| `errorReporter.log_access_event` | **0** (rpc مباشر) | غ.م | لا retry — fallback محلي عند الفشل |

**قواعد عامة:**
- `auth/permission/validation` → **لا retry** أبداً.
- `network/server` → retry تلقائي حتى `maxAttempts`.
- `rate_limit` → retry فقط للمسارات غير الحسّاسة (الحسّاسة تُظهر `retry_after` للمستخدم).
- العميل لا يُطبّق throttling عام — `check_rate_limit` على السيرفر هو خط الدفاع الموحّد.

راجع `docs/api/network-inventory.md` للسياسة الفعلية لكل endpoint، و
`docs/api/cors-verification.md` لمصفوفة CORS الميدانية.

## Caching invariants (per domain)

| الدومين | staleTime | invalidate عند |
|---------|-----------|----------------|
| Financial (`useDashboardSummary`, `useInvoices`, allocations, distribution) | `STALE_FINANCIAL` (60s) | إغلاق سنة، توزيع، دفع فاتورة، تعديل عقد |
| Contracts | `STALE_FINANCIAL` (60s) | CRUD على عقد/مستأجر/وحدة |
| Dashboard prefetch | `2*60_000` صريح | تلقائي عند تغيير fiscalYearId (مع AbortController) |
| Messaging/Support (`useSupportAnalytics`, `useUserManagementData`) | `STALE_MESSAGING` (30s) | إنشاء/تحديث/حذف تذكرة، إجراء على مستخدم |
| Reference (الأدوار، الإعدادات) | `STALE_REFERENCE` (15min) | تغيير دور أو إعداد |
| Public (`useBylaws`, public stats) | `STALE_PUBLIC`/`STALE_STATIC` (5min) | تحديث محتوى من admin |

ملاحظات `queryClient.ts`:
- `gcTime` افتراضي (5 دقائق) — متّسق مع `STALE_STATIC`، لا تعارض.
- `refetchOnWindowFocus: false` — مُعطَّل عمداً لتفادي طلبات شبح. الـ realtime
  channels تتولى التحديث الحي حيث يلزم.

## جولة C — Version D — مكتملة (2026-05-11)

### المُنجز
- ترحيل 7 ملفات إلى `invoke()` (5 مباشرة + 2 حساسة).
- 2 Zod schemas: `dashboardSummarySchema`, `supportAnalyticsSchema` + helper `parseOrThrow`.
- تحقق CORS ميداني (12 سيناريو) — راجع `edge-functions.md > CORS verified matrix`.
- توثيق caching invariants لكل دومين.

### المستثنى عمداً
- `AuthContext.tsx` (نداء `guard-signup`) — قاعدة AGENTS.md.
- `errorReporter.ts` (rpc `log_access_event`) — طبقة تسجيل أساسية.
- `executeDistributionSchema` — مؤجَّل لجولة منفصلة (RPC وليس Edge Function).

### الاختبارات
- `bunx vitest run src/lib/api`: **23 passed** (9 rpc + 8 invoke + 6 schemas).
