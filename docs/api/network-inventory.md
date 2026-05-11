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
| `check-contract-expiry` | service_role JWT (cron) أو admin user (متصفح) | — (cron) / `invoke()` (متصفح) | غ.م | لا | غ.م | غ.م |
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

تم التحقق المباشر (2026-05-11) من نمط المصادقة في كل Edge Function. يُميَّز بين ثلاث حالات تبني:

- **Full** — تستخدم `authenticate()` من `_shared/auth.ts` (Bearer → `getUser()` → role check → rate-limit في خطوة واحدة).
- **Partial** — تستخدم helper واحد فقط من `_shared/auth.ts` (مثل `isServiceRole`)، دون `authenticate()` الكاملة.
- **None** — لا تستورد من `_shared/auth.ts` إطلاقاً (مصادقة يدوية محلية أو anon أو HMAC).

| Function | Adoption | الملاحظة |
|---|:-:|---|
| `admin-manage-users` | **Full** | يستخدم `authenticate()` بـ `allowedRoles: ['admin']` |
| `generate-invoice-pdf` | **Full** | يستخدم `authenticate()` بـ rate-limit مخصص |
| `dashboard-summary` | **Full** | يستخدم `authenticate()` بـ admin/accountant + claims محلي |
| `beneficiary-summary` | **Full** | يستخدم `authenticate()` بـ rate-limit بمفتاح خاص |
| `email-admin` | **Full** | يستخدم `authenticate()` بـ `allowedRoles: ['admin']` |
| `zatca-onboard` / `zatca-renew` / `zatca-report` | **Full** | يستخدمون `authenticateAdmin()` (غلاف رفيع لـ `authenticate()`) |
| `zatca-signer` | **Full** | تم الترحيل (Version J) — `authenticate()` بـ admin/accountant + rate-limit `zatca-signer` |
| `zatca-xml-generator` | **Full** | تم الترحيل (Version J) — `authenticate()` بـ admin/accountant + rate-limit `zatca-xml` |
| `ai-assistant` | **Full** | تم الترحيل (Version J) — `authenticate()` للـ JWT + per-minute؛ Quota اليومي يدوي بعد المصادقة (rate-limit ثاني غير مدعوم في `authenticate()`) |
| `process-email-queue` | **Partial** | يستخدم `isServiceRole()` فقط — مبرر: cron-only بـ service_role JWT، لا حاجة لفحص دور أو rate-limit مستخدم |
| `check-contract-expiry` | **Partial** | يستخدم `isServiceRole()` لمسار cron + `getUser()` يدوي + role check للمسار اليدوي. مسارَين متباينَين في دالة واحدة |
| `webauthn` | **None** | dispatcher مع 4 handlers بسياسات auth مختلطة |
| `lookup-national-id` | **None** | **anon flow** — لا JWT للتحقق منه |
| `guard-signup` | **None** | **anon flow** — قبل التسجيل |
| `auth-email-hook` | **None** | webhook مُوقَّع بـ HMAC + مسار `/preview` بـ `LOVABLE_API_KEY` |
| `health-check` | **None** | عام بلا auth |

### خلاصة (Version J — 2026-05-11)

- **10/17** functions تتبنى `_shared/auth.ts` بالكامل (`authenticate()` أو `authenticateAdmin()`) — قفزة من 2/17 في Version E.
- **2/17** تتبنى Partial (`isServiceRole()` فقط) — مبررة معمارياً لمسارات cron / dual-mode.
- **5/17** لا تتبنى — كلها مستثناة معمارياً:
  - **2 anon flows** (`guard-signup`, `lookup-national-id`)
  - **1 webhook بـ HMAC** (`auth-email-hook`)
  - **1 dispatcher مختلط** (`webauthn`)
  - **1 عام بلا auth** (`health-check`)

**التوحيد بلغ سقفه المعقول.** أي ترحيل إضافي يتطلب توسيع `authenticate()` لدعم anon أو HMAC أو multi-rate-limit، وهو tradeoff معماري مفتوح.

---

## 7. CORS Exceptions

استثناءات موثقة لا تستخدم `_shared/cors.ts` المركزي (`getCorsHeaders`):

### `auth-email-hook`

تحتوي مسارين بسياسات CORS مختلفة:

| المسار | CORS | المصدر | الحماية |
|---|---|---|---|
| `POST /` | `getCorsHeaders(req)` المركزي | `_shared/cors.ts` | توقيع HMAC من Supabase Auth Hooks |
| `GET /preview` | `Access-Control-Allow-Origin: *` + `Access-Control-Allow-Headers: 'authorization, content-type'` | محلي داخل الملف (سطر 81) | `Authorization: Bearer ${LOVABLE_API_KEY}` (وليس JWT مستخدم) |

**المبرر:** مسار `/preview` يُستخدم لمعاينة قوالب البريد من بيئات تطوير متعددة (لوحات admin، أدوات التصميم)، لذا CORS مفتوح intentional. الحماية تتم على طبقة `Authorization` بالمفتاح السري `LOVABLE_API_KEY`، فلا أهمية لتقييد origin هنا.

---

## 8. استثناءات services إضافية (تكميل لجدول §3)

| الملف | النمط | السبب | الحالة |
|---|---|---|---|
| `src/lib/services/dataFetcher.ts` | `supabase.from(table).select(...).limit(5000)` مباشر | خدمة تصدير قراءة فقط بحدود واضحة؛ ليست استدعاء Edge Function/RPC | ✅ خارج النطاق |
| `src/lib/services/fiscalYearService.ts` | يجمع `.from(...).insert()` مباشر مع `rpc()` للـ RPCs (`reopen_fiscal_year`, `close_fiscal_year`) | direct CRUD مقبول للجداول البسيطة؛ RPCs مغلفة عبر `rpc()` بالفعل | ✅ خارج النطاق |
| `src/lib/services/securityService.ts` | `.from('access_log').select(...)` مباشر للقراءة الأمنية | graceful degradation محلي مع log + return؛ ليست استدعاء API | ✅ خارج النطاق |
| `src/lib/services/invoiceStorageService.ts` | `supabase.storage.from(...).upload(...)` + `.from('invoices').update(...)` | عمليات Storage مع تحديث DB؛ تم تعزيز error logging في Version G | ✅ موثّق |
| `src/lib/services/advanceService.ts` | fire-and-forget `supabase.from('beneficiaries').select(...)` لإشعار side-effect | تم تحويله إلى async/try-catch مع `logger.warn` في Version G | ✅ موثّق |
