# Network Inventory — جرد شامل لطبقة الشبكة

> آخر تحديث: 2026-05-11 (Version E)
> هذا الملف هو المرجع الموحّد لكل نقطة شبكة في المشروع: Edge Functions، RPCs،
> والاستثناءات المبررة لاستدعاءات `.from()` المباشرة.

## 1. Edge Functions

| Function | Auth | Wrapper | Retry | Rate-limit | Cache (client) | Runtime Validation |
|---|---|---|---|---|---|---|
| `dashboard-summary` | JWT (manual) | `invoke()` | 3× backoff | server: لا | `STALE_FINANCIAL` (60s) | ✅ Zod (`dashboardSummarySchema`) |
| `admin-manage-users` | JWT + admin | `invoke()` | 3× backoff | لا | لا (mutation) | ❌ |
| `lookup-national-id` | anon | `invoke()` `maxAttempts:1` `treatDataErrorAsFailure:false` | 1 (يدوي) | server: `IP+nid` → 429 + `retry_after` | لا | ❌ (يقرأ `data.found/session/retry_after`) |
| `guard-signup` | anon | `invoke()` (في `AuthContext`) | تلقائي | server: `IP+email` | لا | ❌ |
| `generate-invoice-pdf` | JWT | `invoke()` | 3× backoff | لا | لا | ❌ (`{ results }`) |
| `webauthn` (challenge ops) | mixed | `invoke()` `maxAttempts:1` | 1 | لا (التحدي مرة واحدة) | لا | ❌ |
| `zatca-onboard` | admin | `invoke()` `maxAttempts:1` | 1 | لا | لا | ❌ |
| `zatca-renew` / `zatca-report` / `zatca-signer` / `zatca-xml-generator` | admin | `invoke()` | 3× backoff | لا | لا | ❌ |
| `process-email-queue` | **`verify_jwt = true`** (cron) | `invoke()` | 3× backoff | لا | لا | ❌ |
| `email-admin` | admin | `invoke()` | 3× backoff | لا | لا | ❌ |
| `auth-email-hook` | webhook (HMAC) | — (server-to-server) | غ.م | لا | غ.م | غ.م |
| `check-contract-expiry` | service | — (cron) | غ.م | لا | غ.م | غ.م |
| `health-check` | none | direct (تشخيص) | غ.م | لا | غ.م | غ.م |
| `ai-assistant` | JWT | `invoke()` | 3× backoff | upstream gateway | لا | ❌ |

**ملاحظة:** عمود "Wrapper" يشير إلى استخدام `src/lib/api/invoke.ts` من جانب الواجهة. الاستثناء الوحيد هو `AuthContext.tsx` الذي يستدعي `guard-signup` مباشرة (ممنوع التعديل بقاعدة المشروع).

## 2. RPCs الرئيسية (عبر `rpc()` wrapper)

| RPC | Wrapper | Retry | Cache | Runtime Validation |
|---|---|---|---|---|
| `get_support_analytics` | `rpc()` | 3× backoff | `STALE_MESSAGING` | ✅ Zod (`supportAnalyticsSchema`) |
| `get_max_advance_amount` | `rpc()` | 3× backoff | `STALE_FINANCIAL` | ❌ (cast) |
| `execute_distribution` | `rpc()` | 3× backoff | لا (mutation) | ❌ (server-authoritative) |
| `close_fiscal_year` / `reopen_fiscal_year` | `rpc()` | 3× backoff | invalidate | ❌ |
| `check_rate_limit` | `rpc()` (server-side فقط) | — | — | — |
| `log_access_event` | **استثناء** — `supabase.rpc` مباشر | لا | — | — |
| `notify_*` | `rpc()` | 3× backoff | invalidate | ❌ |

## 3. استثناءات مبررة (لا تستخدم الغلاف الموحّد)

| الملف | النمط | السبب | حالة الترحيل |
|---|---|---|---|
| `src/contexts/AuthContext.tsx` | `supabase.functions.invoke('guard-signup')` مباشر | قاعدة المشروع تمنع تعديل ملفات المصادقة دون طلب صريح | ❌ مرفوض بوعي |
| `src/lib/errorReporter.ts` | `supabase.rpc('log_access_event')` مباشر | fallback لتسجيل الأخطاء — لا يجب أن يفشل بسبب فشل الغلاف نفسه | ❌ مرفوض بوعي |
| `src/lib/services/notificationService.ts` | `supabase.from('notifications').insert(...)` fire-and-forget | إدراج مباشر على جدول، ليس استدعاء Edge Function/RPC؛ لا retry بالتصميم | ✅ خارج النطاق |
| `src/lib/services/diagnosticsService.ts` | `supabase.from(...).select(count)` | فحوصات صحة على جداول مباشرة (count-only)؛ ليست استدعاءات API | ✅ خارج النطاق |

## 4. مرجع سياسات Retry / Rate-limit

راجع `docs/api/README.md` — قسم "Retry & Rate-limit Policy".

## 5. مرجع CORS

راجع `docs/api/cors-verification.md` لمصفوفة التحقق الميداني.

---

## 6. Auth Abstraction Adoption Matrix

تم التحقق المباشر (2026-05-11) من نمط المصادقة في كل Edge Function:

| Function | يستخدم `_shared/auth.ts`؟ | السبب عند عدم الاستخدام |
|---|:-:|---|
| `admin-manage-users` | ✅ | — |
| `generate-invoice-pdf` | ✅ | — |
| `process-email-queue` | ✅ | — |
| `check-contract-expiry` | ✅ | — |
| `dashboard-summary` | ❌ | يدير role check محلياً + admin/accountant/beneficiary بسياسات مختلفة لكل دور |
| `beneficiary-summary` | ❌ | role-scoped على `beneficiary` فقط مع rate-limit بمفتاح خاص (`beneficiary-summary:${user.id}`) |
| `email-admin` | ❌ | dispatcher صغير + منطق DLQ متخصص؛ الترحيل يضيف تعقيداً بدون قيمة |
| `webauthn` | ❌ | dispatcher مع 4 handlers بسياسات auth مختلفة (`register-options/verify` JWT، `auth-options/verify` anon)؛ التوحيد يُضعف الفصل |
| `lookup-national-id` | ❌ | **anon flow** — لا JWT للتحقق منه |
| `guard-signup` | ❌ | **anon flow** — قبل التسجيل |
| `auth-email-hook` | ❌ | webhook مُوقَّع بـ HMAC، ليس Bearer JWT |
| `health-check` | ❌ | عام بلا auth |
| `ai-assistant` | ❌ (يدوي عبر `userClient.auth.getUser()`) | مرشّح مقبول للترحيل في جولة منفصلة |
| `zatca-onboard` / `zatca-renew` / `zatca-report` | ❌ (غير محدد بصياغة auth قياسية) | منطق ZATCA-specific؛ يحتاج جولة مخصصة |
| `zatca-signer` / `zatca-xml-generator` | ❌ (يدوي عبر `getUser()`) | مرشّحان مقبولان للترحيل في جولة منفصلة |

### خلاصة

- **4/17** functions تستخدم `_shared/auth.ts` بالكامل.
- **13/17** تستخدم نمطاً يدوياً — منها:
  - **6 لا يمكن توحيدها معمارياً** (anon flows × 2، webhook بـ HMAC، health-check العام، dispatchers بسياسات مختلطة × 2).
  - **3 تحتاج توحيداً مع تعديل سياسة rate-limit/role** — قرار مؤجل (`dashboard-summary`, `beneficiary-summary`, `email-admin`).
  - **4 مرشّحات مقبولة للترحيل في جولة لاحقة** (`ai-assistant`, `zatca-signer`, `zatca-xml-generator`, ربما `zatca-report`).

**التوحيد الكامل غير ممكن — هناك 3 فئات auth جوهرياً (JWT user / webhook signature / anon)، وفي كل فئة استثناءات مبررة.** الترحيل القسري لـ functions حسّاسة (`webauthn`, `guard-signup`, `lookup-national-id`) محظور بقاعدة المشروع.
