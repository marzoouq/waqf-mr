
# M2 + M3 — التنفيذ الحقيقي (Version I-R)

نطاق هذه الجولة: تنفيذ **المستوى المتوسط (M2)** ثم **المستوى العالي (M3)** من Version I-R، مع احترام كل القيود التي اعترض عليها المراجع الخارجي. لا تغييرات على schema/RLS/API contracts/UX.

---

## أرقام مُتحقَّق منها مباشرة (Now)

| البند | القيمة |
|---|---|
| الـ 12 hook + عدد `supabase.from(` في كل واحد | useZatcaOnboardingReadiness: 1 · useIncome: 1 · useSupportTicketMutations: 1 · useZatcaInvoices: 3 · useMessaging: 4 · useUnits: 1 · useNotificationActions: 4 · useAnnualReport: 1 · useAppSettingsWrite: 1 · useAppSettingsRead: 1 · useExpenses: 1 · useInvoices: 1 = **20 إجمالي** |
| `_shared/auth.ts` | 174 سطر، يكشف `authenticate(req, cors, opts)` بـ `getUser()` متسلسل |
| الـ Category A | beneficiary-summary (190س) · dashboard-summary (119س) · email-admin (195س) |

### اكتشاف مهم يؤثر على M3

`dashboard-summary` يستخدم **`getClaims()`** (محلي بدون شبكة) ويوازي 5 استعلامات معًا (auth + body + roles + rateLimit + RPC + pending). الـ `authenticate()` الحالية تستخدم `getUser()` (شبكة إضافية) **متسلسلة قبل** أي business logic.

**ترحيل قسري كما هو الآن = تراجع أداء قابل للقياس.** الحل في M3.1.

---

## M2 — ترحيل تدريجي للـ 12 hook إلى services

### قاعدة جوهرية لكل PR
- **نفس `queryKey` بالحرف الواحد** (لمنع كسر cache invalidation).
- نفس signature الـ hook، نفس بنية البيانات المُرجعة.
- لا تغيير على المستهلكين في `pages/` أو `components/`.

### الخدمات الجديدة (تُنشأ عند الحاجة فقط)

```text
src/lib/services/
├── incomeService.ts              [M2.1]
├── expensesService.ts            [M2.1]
├── invoicesService.ts            [M2.2]   (يكمل invoiceStorageService الموجود)
├── appSettingsService.ts         [M2.3]   (يدمج Read + Write)
├── notificationsCrudService.ts   [M2.4]   (مكمّل لـ notificationService الموجود — actions على notifications/preferences)
├── messagingService.ts           [M2.4]
├── supportService.ts             [M2.4]
├── zatcaInvoicesService.ts       [M2.5]   (يمتد zatcaService الموجود)
├── unitsService.ts               [M2.6]
└── annualReportService.ts        [M2.6]
```

### تقسيم PRs

| PR | المحتوى | Hooks | استدعاءات `.from(` يُزال |
|---|---|---|---|
| **M2.1** | `incomeService` + `expensesService` | useIncome, useExpenses | 2 |
| **M2.2** | `invoicesService` | useInvoices | 1 |
| **M2.3** | `appSettingsService` (Read+Write) | useAppSettingsRead, useAppSettingsWrite | 2 |
| **M2.4** | `notifications/messaging/support` (مجموعة) | useNotificationActions, useMessaging, useSupportTicketMutations | 9 |
| **M2.5** | `zatcaInvoicesService` + امتداد | useZatcaInvoices, useZatcaOnboardingReadiness | 4 |
| **M2.6** | `unitsService` + `annualReportService` | useUnits, useAnnualReport | 2 |

**شكل كل خدمة (نمط واحد متكرر):**

```ts
// src/lib/services/incomeService.ts
import { supabase } from '@/integrations/supabase/client';
import type { Income } from '@/types';

export const incomeService = {
  async list(params: { fiscalYearId: string }): Promise<Income[]> {
    const { data, error } = await supabase
      .from('income')
      .select('...')
      .eq('fiscal_year_id', params.fiscalYearId);
    if (error) throw error;
    return data as Income[];
  },
  async create(payload: NewIncome) { /* ... */ },
  async update(id: string, patch: Partial<Income>) { /* ... */ },
  async remove(id: string) { /* ... */ },
};
```

**شكل الـ hook بعد الترحيل:**

```ts
// src/hooks/data/financial/useIncome.ts
import { useQuery } from '@tanstack/react-query';
import { incomeService } from '@/lib/services/incomeService';
// ...
return useQuery({
  queryKey: ['income', fiscalYearId],   // ← نفس المفتاح بالحرف
  queryFn: () => incomeService.list({ fiscalYearId }),
  // باقي الإعدادات بنفسها
});
```

### معايير القبول لـ M2 (لكل PR)
- ✅ `bun run build` ناجح.
- ✅ الاختبارات الموجودة (vitest) تمر بدون تعديل.
- ✅ `rg "queryKey:\s*\[" <hook>` يُرجع نفس النص قبل/بعد.
- ✅ عدد ملفات `hooks/data` ذات `.from(` يتناقص حسب الجدول أعلاه.

### استثناءات صريحة
- لا نُرحّل `useFiscalYears.ts` (طبقة أساسية متماسكة).
- لا نوسّع `createCrudFactory` بـ `customQuery` إلا إذا ظهر تكرار فعلي ≥3 مرات في خدمات M2.

---

## M3 — Edge Functions auth (محدود ومتدرج)

### M3.1 — تحسين `_shared/auth.ts` قبل أي ترحيل

أهم اعتراض من المراجعة: ترحيل `dashboard-summary` كما هو الآن يكسر pattern الأداء (getClaims + parallel pipeline).

**الحل**: توسعة `authenticate()` بدون كسر التوافق:

```ts
export interface AuthOptions {
  // الموجودة سابقًا
  allowedRoles?: AppRole[];
  rateLimitKey?: string;
  rateLimit?: number;
  rateLimitWindowSeconds?: number;
  // ─── جديدة ───
  /** يستخدم getClaims() المحلي بدل getUser() الشبكي. أسرع. */
  useClaims?: boolean;
  /** قراءة الـ body بالتوازي مع المصادقة وإرجاعه للمستدعي. */
  parseJsonBody?: boolean;
}

export type AuthSuccess = {
  user: { id: string; email?: string | null };
  admin: AdminClient;
  body?: unknown;   // إذا parseJsonBody=true
};
```

سلوك إضافي:
- عند `useClaims=true`: استخدم `userClient.auth.getClaims(token)` بدل `getUser()`. الدور والـ rate limit ينفذان بالتوازي مع قراءة body كما هو حاليًا.
- عند `parseJsonBody=true`: نضمّ `req.json().catch(() => null)` في نفس `Promise.all`.
- التوقيعات القديمة تبقى تعمل بدون أي تغيير (defaults = false).

**هذا التحسين هو شرط مسبق لكل ما يلي.**

### M3.2 — Inventory موثّق (لا كود)

تحديث `docs/api/edge-functions.md` بالـ 5 فئات (A/B/C/D/E) كما اعتُمد في M1.4. يحدد بصراحة من يُرحَّل ومن لا يُرحَّل ولماذا.

### M3.3 — ترحيل Category A فقط (3 functions)

PR منفصل لكل واحدة، بهذا الترتيب:

1. **email-admin** (الأبسط — `getUser()` تسلسلي + role check واحد). ترحيل مباشر لـ `authenticate({ allowedRoles: ['admin'] })`.
2. **beneficiary-summary** (يحتاج فحص دور أوسع). ترحيل مع `allowedRoles: ['beneficiary', 'admin']`.
3. **dashboard-summary** (الأكثر حساسية للأداء). ترحيل **بعد** M3.1 باستخدام `useClaims: true` + `parseJsonBody: true` للحفاظ على pipeline الموازي.

**شكل الترحيل لـ dashboard-summary:**

```ts
const cors = getCorsHeaders(req);
if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

const auth = await authenticate(req, cors, {
  allowedRoles: ['admin', 'accountant'],
  rateLimitKey: 'dashboard-summary',
  useClaims: true,
  parseJsonBody: true,
});
if ('error' in auth) return auth.error;
const { user, admin, body } = auth;

const parsed = RequestSchema.safeParse(body);
// ... باقي المنطق كما هو
```

**التحقق المطلوب قبل الـ merge**:
- استدعاء فعلي عبر `supabase--curl_edge_functions` يُرجع نفس الشكل: `{ aggregated, pending_advances, fetched_at }` و `Cache-Control: private, max-age=60`.
- نفس status codes (200/400/401/403/429/500).
- نفس error messages بالعربية.

### M3.4 — Category B (ZATCA) — اختياري بعد PoC ناجح في A

5 functions: `zatca-onboard`, `zatca-renew`, `zatca-report`, `zatca-signer`, `zatca-xml-generator`.

**لا تُرحَّل دفعة واحدة.** كل function تُفحص:
- هل تأخذ نفس الـ `(req, cors, opts)` pattern؟
- هل تحتاج params/headers خاصة بـ ZATCA؟
- هل تستخدم `authenticateAdmin()` المختصر الموجود؟ (إن نعم، يكفي تنظيف بسيط).

PR لكل function، بنفس معايير M3.3.

### M3.5 — لا يُرحَّل (موثّق بتعليقات)

| Function | السبب |
|---|---|
| `auth-email-hook` | HMAC webhook، لا JWT. |
| `health-check` | عام، لا مصادقة. |
| `lookup-national-id` | anon + rate-limit خاص + concealment behavior مقصود. |
| `guard-signup` | pre-signup public، يُستدعى بدون JWT. |
| `webauthn` | dispatcher mixed (anon options + JWT verify). |
| `check-contract-expiry` | service-role/admin hybrid يستخدم `isServiceRole()` فعلاً. |
| `process-email-queue` | `verify_jwt=true` + `isServiceRole()`. |
| `ai-assistant` | streaming body — لا يجوز استهلاكه في helper. |

كل واحدة تحصل على تعليق سطر أعلى الملف:
```ts
// intentionally bypasses _shared/auth: <one-line reason>
```

### M3.6 — توحيد CORS (سياسة موثقة فقط)

تحديث `supabase/functions/README.md`:
> "افتراضيًا كل function تستورد `getCorsHeaders` من `_shared/cors.ts`. أي استثناء يجب أن يحمل تعليق `// custom CORS: <reason>` أعلى الملف."

لا تغيير قسري على functions تستخدمها بالفعل (الأغلبية).

### M3.7 — حواجز ESLint (آخر شيء — بعد كل ما سبق)

في `eslint.config.js`:

```js
{
  files: ['src/hooks/data/**/*.ts'],
  rules: {
    'no-restricted-syntax': ['warn', {
      selector: "CallExpression[callee.object.name='supabase'][callee.property.name='from']",
      message: 'Prefer lib/services/* (M2). If unavoidable, add // eslint-disable-next-line with reason.',
    }],
  },
},
{
  files: ['src/pages/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': ['error', {
      paths: [{
        name: '@/integrations/supabase/client',
        message: 'pages/components must consume hooks/services, not supabase directly.',
      }],
    }],
  },
},
```

**ملاحظتان مهمتان**:
- مستوى `warn` لا `error` على `hooks/data` — لا يكسر CI أثناء فترة بقاء الاستثناءات.
- لا rule على `lib/`, `integrations/`, `contexts/AuthContext.tsx`.

---

## ترتيب التنفيذ النهائي

| الترتيب | البند | المخاطرة |
|---|---|---|
| 1 | M2.1 — income + expenses | منخفضة |
| 2 | M2.2 — invoices | منخفضة |
| 3 | M2.3 — app settings | منخفضة |
| 4 | M2.4 — notifications + messaging + support (الأكبر، 9 استدعاءات) | متوسطة |
| 5 | M2.5 — zatca invoices + readiness | متوسطة |
| 6 | M2.6 — units + annual report | منخفضة |
| 7 | M3.1 — توسعة `_shared/auth.ts` (useClaims + parseJsonBody) | منخفضة (إضافة فقط) |
| 8 | M3.2 — تحديث `docs/api/edge-functions.md` بالـ 5 فئات | لا تغيير كود |
| 9 | M3.3a — ترحيل email-admin | منخفضة |
| 10 | M3.3b — ترحيل beneficiary-summary | منخفضة |
| 11 | M3.3c — ترحيل dashboard-summary (يستخدم useClaims) | متوسطة (perf-sensitive) |
| 12 | M3.4 — Category B واحدة تلو الأخرى (اختياري) | متوسطة |
| 13 | M3.5 — تعليقات استثناء على الـ 8 functions | لا تغيير سلوك |
| 14 | M3.6 — تحديث سياسة CORS في README | لا كود |
| 15 | M3.7 — ESLint guards (warn فقط في hooks/data) | منخفضة |

---

## معايير القبول النهائية

- ✅ كل M2 PR يحافظ على `queryKey` بالحرف، الاختبارات تمر، الـ build ناجح.
- ✅ بعد كل M2: عدد ملفات `hooks/data` ذات `.from(` ينخفض من 12 إلى **0** (مع استثناءات موثقة لـ `useFiscalYears.ts` فقط).
- ✅ M3.1 لا يكسر التوقيع القديم لـ `authenticate()` — كل الاستخدامات الحالية تعمل بلا تعديل.
- ✅ M3.3 الترحيلات الثلاثة: `supabase--curl_edge_functions` يؤكد نفس shape + status + headers.
- ✅ بعد M3.3: عدد functions تستخدم `_shared/auth` يصبح **7** (4 حالية + 3 جديدة)، مع توسعة محتملة إلى ~10 بعد M3.4.
- ✅ `0 تغيير` على schema, RLS, types, client, config.toml, عقود API.

---

## ما تم استبعاده عمدًا

- ❌ ترحيل قسري لكل الـ 14 function — تم رفضه في Version I-R.
- ❌ نقل `useDashboardPrefetch` خارج Provider.
- ❌ توسيع `createCrudFactory` بشكل استباقي.
- ❌ ESLint `error` على `supabase.from` في hooks/data — يبقى `warn` لمنع كسر CI.
- ❌ استبدال `getUser()` افتراضيًا بـ `getClaims()` في `_shared/auth.ts` — opt-in فقط للحفاظ على التوافق.

