# خطة إكمال M2.4 + M2.5 + M2.6 + M3

## الحالة الحالية (تحقق فعلي)

**المتبقي في `src/hooks/data/`** — 14 مكالمة `supabase.from()` في 6 ملفات:

| الملف | المكالمات | الخدمة |
|------|----------|--------|
| `notifications/useNotificationActions.ts` | 4 | `notificationsCrudService` (موجود) |
| `messaging/useMessaging.ts` | 4 | `messagingService` (موجود) |
| `support/useSupportTicketMutations.ts` | 1 | `supportService` (موجود) |
| `zatca/useZatcaInvoices.ts` | 3 | `zatcaInvoicesService` (موجود) |
| `zatca/useZatcaOnboardingReadiness.ts` | 1 | يُضاف لـ `zatcaInvoicesService` |
| `content/useAnnualReport.ts` | 1 | `annualReportService` (موجود) |

**استثناءات مقصودة (تبقى)**: `useFiscalYears.ts` (وصول مباشر لتجنّب دائرية)، أي `.rpc()` يبقى كما هو.

---

## M2.4 — Notifications + Support (PR صغير)
- ربط `useNotificationActions.ts` بـ `notificationsCrudService` (4 مكالمات: list/markRead/markAllRead/delete)
- ربط `useSupportTicketMutations.ts` بـ `supportService` (1 مكالمة: create ticket مع توليد TKT-YYYYMMDD)
- نفس `queryKey` بالضبط — لا تغيير على الواجهة

## M2.5 — Messaging
- ربط `useMessaging.ts` بـ `messagingService` (4 مكالمات: fetchThreads/fetchMessages/sendMessage/markRead)
- الحفاظ على منطق Realtime channel كما هو في الـ hook (لا يُنقل)

## M2.6 — ZATCA + Annual Report
- ربط `useZatcaInvoices.ts` بـ `zatcaInvoicesService` (3 مكالمات)
- ربط `useZatcaOnboardingReadiness.ts` بـ نفس الخدمة (1 مكالمة)
- ربط `useAnnualReport.ts` بـ `annualReportService` (1 مكالمة)

**معيار قبول M2**: `rg "supabase\.from\(" src/hooks/data/ | wc -l` ≤ 1 (فقط `useFiscalYears.ts`).

---

## M3.1 — تحسين `_shared/auth.ts` (إضافة فقط، لا breaking)

أضف خيارَين جديدَين لدالة `authenticate()` الحالية دون تغيير توقيعها:

```ts
export interface AuthOptions {
  // ... الموجود
  /** استخدم getClaims() المحلي بدل getUser() (أسرع، لا round-trip). */
  useClaims?: boolean;
  /** parse JSON body بالتوازي مع المصادقة. */
  parseJsonBody?: boolean;
}

export type AuthSuccess = {
  user: { id: string; email?: string | null };
  admin: AdminClient;
  body?: unknown; // إذا parseJsonBody = true
};
```

- `useClaims: true` → يستخدم `supabase.auth.getClaims(token)` بدل `getUser()` (لا شبكة).
- `parseJsonBody: true` → يبدأ `req.json()` بالتوازي مع المصادقة عبر `Promise.all`.
- التوقيع الحالي يبقى يعمل (الخيارات اختيارية).

## M3.2 — اعتماد في 3 وظائف Category A (الأبسط)
- `email-admin` → `authenticate(req, cors, { allowedRoles: ["admin"] })`
- `beneficiary-summary` → نفس النمط مع أدوار أوسع
- `dashboard-summary` → يستخدم `useClaims: true` + `parseJsonBody: true` (للحفاظ على pipeline متوازي حالي)

## M3.3 — Category B (ZATCA) — اختياري، واحد في كل مرة
لاحقًا (PR منفصل): `zatca-onboard`, `zatca-report`, `zatca-renew`, `zatca-clearance`, `zatca-status`.

## M3.4 — توثيق الاستثناءات
في `supabase/functions/README.md` نُوثّق صراحةً الـ8 وظائف التي **لا** تستخدم `_shared/auth` ولماذا (HMAC/anon/public/service-role/streaming).

## M3.5 — قواعد ESLint (no-restricted-syntax)
- `warn` على `supabase.from(` داخل `src/hooks/data/**` (تحذير، ليس خطأ — للسماح بالاستثناءات الموثقة).
- `error` على `supabase.from(` و `supabase.auth.` داخل `src/pages/**` و `src/components/**`.

---

## معايير القبول النهائية

- `rg "supabase\.from\(" src/hooks/data/ | wc -l` ≤ 1
- `_shared/auth.ts` يدعم `useClaims` و `parseJsonBody` بدون كسر التوقيع
- 3 وظائف Category A تستخدم `authenticate()`
- ESLint rules مفعّلة
- جميع الاختبارات (11) تمر
- **0 تغيير على**: `config.toml`, `client.ts`, `types.ts`, `.env`, RLS, schema, query keys, API contracts

---

## ترتيب التنفيذ

`M2.4` → `M2.5` → `M2.6` → اختبار → `M3.1` → `M3.2` (3 وظائف بالتوازي) → `M3.4` (توثيق) → `M3.5` (ESLint) → اختبار نهائي.

M3.3 (ZATCA) يُؤجّل لـ PR لاحق منفصل لتقليل المخاطر.
