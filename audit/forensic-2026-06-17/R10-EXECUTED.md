# R10 — تنظيف نهائي (مُنفَّذ 2026-06-22)

## 1) ✅ منفّذ في R10

### أ. Migration — REVOKE EXECUTE موجَّه

```sql
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_rate_limit_count(text) FROM anon, authenticated;
```

**التحقق عبر `has_function_privilege`:**

| الدالة | anon قبل | anon بعد | auth قبل | auth بعد |
|--------|----------|----------|----------|----------|
| `check_rate_limit` | YES | **false** | no | false |
| `get_rate_limit_count` | YES | **false** | YES | **false** |

**المبرر:** كلتاهما تُستدعى حصراً من Edge Functions عبر `service_role` (تحقّقنا عبر `rg` — لا استدعاءات client). لا تأثير على أي ميزة.

### ب. قاعدة ESLint جديدة

أُضيفت في `eslint.config.js` لمنع `queryKey: ['literal', ...]` خارج `src/lib/queryKeys/`:

```js
{
  files: ["src/hooks/**/*.{ts,tsx}", "src/lib/queryClient.ts"],
  ignores: ["src/lib/queryKeys/**", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
  rules: {
    "no-restricted-syntax": ["error", {
      selector: "Property[key.name='queryKey'] > ArrayExpression > Literal:first-child",
      message: "استخدم helpers من @/lib/queryKeys بدلاً من string literal في queryKey.",
    }],
  },
}
```

**النتيجة:** 0 انتهاكات queryKey في الكود الحالي. القاعدة فعّالة لمنع الانحدارات المستقبلية.

## 2) ✅ منفّذ سابقاً (تحقّق بدون عمل)

| البند | الموقع | الحالة |
|------|--------|--------|
| Rate-limit على `webauthn:auth-options` (W2-F14) | `supabase/functions/webauthn/handlers/auth-options.ts:15-25` | منفّذ — 10/دقيقة/IP عبر `check_rate_limit` |
| `useCrudFactory` يقبل `queryKey` صراحةً | `src/hooks/data/core/useCrudFactory.ts` | منفّذ كبارامتر |

## 3) ⏸ دين معماري موثَّق (لا يُنفَّذ في R10)

| البند | المبرر |
|-------|--------|
| WebAuthn HttpOnly cookie (W2-F13) | يتطلب BFF أو تعديل `client.ts` المحمي — موثَّق في R7 |
| `contracts_safe` SECURITY DEFINER view | `security_invoker=false` مقصود لإخفاء PII — `mem://security/views/contracts-safe-rationale` |

## 4) 🔵 إيجابي كاذب موثَّق (كان مُدرَجاً كـ R11)

أثناء `security--run_security_scan` ظهر finding بمستوى error:

> **EXPOSED_SENSITIVE_DATA**: سياسة storage `Authenticated users can view invoices` تمنح `SELECT` على bucket `invoices` لأي `authenticated`.

**التحقق المباشر من `pg_policies` (3 استعلامات مستقلة) أثبت أن السياسة غير موجودة.** السبب: `supabase_lov` scanner v3.2 يستخدم cache قديم سابق لـ R5. التفاصيل الكاملة في `audit/forensic-2026-06-17/R11-VERIFICATION.md`.

- bucket `invoices` خاص (public=false).
- السياسة الوحيدة للقراءة عليه مقيَّدة بـ `has_role(admin|accountant)`.
- المستفيد/الواقف لا يستطيعان الوصول. لا حاجة لـ R11 تنفيذي.

## 5) ملاحظة على `security--manage_security_finding`

`get_scan_results` يُرجع `findings: []` فارغة لكل scanner — لا توجد findings مُستمرّة بـ `internal_id` لقبولها رسمياً. التحذيرات الـ184 المعروضة في `run_security_scan` هي **عدّ حي من Linter**، ليست سجلات مُخزَّنة قابلة للـ ignore عبر الأداة. القبول يبقى موثَّقاً في هذا الملف وفي `docs/security/views.md`.

## 6) التحقق الشامل

| فحص | النتيجة |
|------|---------|
| `supabase--linter` | 39 issue (انخفض من 42 — `−1` view + `−1` anon + `−1` auth) |
| `bunx vitest run` | **2125/2125 ✅** |
| `bunx eslint src/hooks/**` | 0 خطأ queryKey (الأخطاء الـ2 الأخرى سابقة عن R10 — react-hooks/immutability) |
| `has_function_privilege` للدوال الـ4 | مطابق للخطة 100% |
| `publicRpcAccess.test.ts` | ✅ (لم تُلمس الدالتان المحميتان) |

## 7) ملخص R-NOW → R10

| الجولة | إصلاحات | حالة |
|--------|---------|------|
| R-NOW | 1 (W7-1) | ✅ |
| R5 (DB) | 8 | ✅ |
| R6 (Edge) | 9 | ✅ |
| R7 (Auth) | 5 | ✅ |
| R8 (Perf/A11y) | عدة | ✅ |
| R9 (DB cleanup) | 6 فهارس + 42 GRANT | ✅ |
| **R10** | **2 REVOKE + ESLint rule + اكتشاف R11** | ✅ |
| **الإجمالي** | **~33 إصلاح فعلي** | — |

## 8) التالي (R11 مقترح)

- إصلاح سياسة `storage.objects` على bucket `invoices` لتقييد الوصول للناظر/المحاسب فقط.
- مراجعة باقي storage policies (waqf-assets, إن وُجدت buckets أخرى).
- الإصلاحان الـ2 المتبقيان في ESLint (`react-hooks/immutability` في `useAiChat.ts`).
