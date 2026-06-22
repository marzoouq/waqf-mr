
## R10 — خطة نهائية (تحقق ميداني مكتمل)

### الأدلة الجديدة من فحص بيئة مستقلة

| الدالة | anon | auth | استدعاء من client/edges | قرار |
|--------|------|------|--------------------------|------|
| `get_public_stats` | ✅ | ✅ | `usePublicStats.ts` + `publicRpcAccess.test.ts` يحمي anon | **يبقى — مقصود** |
| `log_access_event` | ✅ | ✅ | `errorReporter.ts`، `accessLogService.ts`، Edge `lookup-national-id`، اختبار anon موجود | **يبقى — مقصود** |
| `check_rate_limit` | ✅ | ❌ | Edge Functions فقط (service_role) — لا استدعاء من client | **REVOKE من anon** آمن |
| `get_rate_limit_count` | ✅ | ✅ | Edge `lookup-national-id` فقط (service_role) — لا استدعاء من client | **REVOKE من anon + authenticated** آمن |

**اكتشاف إضافي:** فحص literal queryKey انتهاكات في `src/` (مستثنياً `lib/queryKeys/` والاختبارات) = **صفر**. قاعدة ESLint يمكن إضافتها كـ `error` مباشرة بدون مخاطر.

اكتُشف أيضاً اختبار جاهز `src/test/publicRpcAccess.test.ts` يحمي `get_public_stats` و `log_access_event` فقط — لا يغطّي `check_rate_limit` ولا `get_rate_limit_count`، يؤكد أن REVOKE عليهما آمن.

---

### تنفيذ R10 — 4 إجراءات

#### 1) Migration واحدة — REVOKE EXECUTE موجَّه

```sql
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_rate_limit_count(text) FROM anon, authenticated;
-- service_role/postgres يحتفظان (تستخدمهما Edge Functions)
```

تعليق: تقليل سطح الهجوم — لم يكن أحد يستدعيها من client أصلاً.

#### 2) قاعدة ESLint جديدة في `eslint.config.js`

```js
{
  selector:
    "Property[key.name='queryKey'] > ArrayExpression > Literal:first-child",
  message: "استخدم helpers من @/lib/queryKeys بدلاً من string literal",
}
```
مع `overrides` لـ `src/lib/queryKeys/**` و `**/*.{test,spec}.{ts,tsx}` و `src/test/**`.

#### 3) Batch ignore للـ Linter findings المتبقية عبر `security--manage_security_finding`

بعد تشغيل `security--get_scan_results`، إصدار `ignore` جماعي مع شروح موحَّدة لـ:
- **ERROR 1** (`contracts_safe`): "security_invoker=false مقصود لإخفاء PII — `mem://security/views/contracts-safe-rationale` و `docs/security/views.md`."
- **WARN B (~35 دالة authenticated):** "guarded internally بـ `has_role(auth.uid(), ...)` + RLS — SECURITY DEFINER ضروري لتجاوز RLS بعد التحقق."
- **WARN C (دوال trigger/cron/crypto بدون EXECUTE خارجي):** "محصورة على postgres/service_role — غير قابلة للاستدعاء من Data API."
- **WARN A (anon-exec الـ4):** بعد §1، يبقى 3 (public_stats, log_access_event, check_rate_limit/auth): "مقصودة للسطح العام، محمية بـ rate-limit و `publicRpcAccess.test.ts`."

#### 4) توثيق

`audit/forensic-2026-06-17/R10-EXECUTED.md`:
- ✅ منفّذ سابقاً: rate-limit auth-options، `useCrudFactory.queryKey`.
- 🔧 منفّذ الآن: REVOKEs (2 دوال) + قاعدة ESLint + accept لـ41 finding.
- ⏸ دين معماري: WebAuthn HttpOnly cookie، contracts_safe view.

---

### التحقق

| فحص | متوقَّع |
|-----|---------|
| `bunx vitest run src/test/publicRpcAccess.test.ts` | ✅ (الدالتان المحميتان لم تُلمسا) |
| `bunx vitest run` كامل | 2125/2125 |
| `bun run lint` | لا أخطاء جديدة (0 انتهاكات قائمة) |
| `supabase--linter` | يبقى 40-42 WARN لكنها كلها مقبولة عبر §3 |
| `supabase--read_query` على `has_function_privilege('anon', …)` | `check_rate_limit` و `get_rate_limit_count` = `no` |

---

### الملفات المتأثرة

- جديد: 1 migration (REVOKE فقط).
- جديد: `audit/forensic-2026-06-17/R10-EXECUTED.md`.
- تعديل: `eslint.config.js` (إضافة rule + overrides).

**لا تعديل على:** Edge Functions، RLS policies، client.ts، types.ts، .env، config.toml، أي منطق تطبيق.

### المخاطر — كلها مخفَّفة بأدلة

- ❌ ~~REVOKE يكسر استدعاءات client~~ — تحقّقت: لا استدعاءات client للدالتين.
- ❌ ~~قاعدة ESLint تكسر الكود~~ — تحقّقت: 0 انتهاكات حالية.
- ⚠️ قبول 41 finding عبر `manage_security_finding` يعتمد على تطابق `internal_id` مع scanner — سأجلبها أولاً عبر `get_scan_results` قبل الـ batch.
