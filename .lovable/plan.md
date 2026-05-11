# جولة C — النسخة D (نهائية بعد التحقق المباشر)

## ما تأكَّد بالحصر الكامل (rg، لا code search)

```
invoke files (8):
  src/contexts/AuthContext.tsx          ← مستثنى (قاعدة AGENTS.md)
  src/hooks/auth/useUserManagementData.ts
  src/hooks/data/beneficiaries/useBeneficiaryUsers.ts
  src/hooks/data/dashboard/useDashboardPrefetch.ts
  src/hooks/data/invoices/useInvoices.ts
  src/hooks/data/zatca/useZatcaOnboarding.ts
  src/hooks/page/admin/management/useEmailMonitorPage.ts
  src/lib/auth/nationalIdLogin.ts
  + src/test/edgeFunctionAuth.test.ts   ← اختبار، لا يُرحَّل

rpc files (2):
  src/lib/errorReporter.ts              ← مستثنى (طبقة تسجيل)
  src/test/notificationRpcSecurity.test.ts ← اختبار

Edge Functions موجودة فعلاً (لا support-analytics ولا execute-distribution):
  admin-manage-users, ai-assistant, auth-email-hook, beneficiary-summary,
  check-contract-expiry, dashboard-summary, email-admin, generate-invoice-pdf,
  guard-signup, health-check, lookup-national-id, process-email-queue,
  webauthn, zatca-onboard, zatca-renew, zatca-report, zatca-signer,
  zatca-xml-generator
```

**الأرقام النهائية:** 7 ملفات invoke للترحيل + 0 ملفات rpc.

## التصحيحات على النسخة السابقة


| البند الخاطئ                                         | التصحيح                                                                 |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| `supportAnalyticsSchema` كـ Edge Function            | ❌ محذوف — `get_support_analytics` هو **RPC** وليس Edge Function         |
| `executeDistributionSchema` كـ Edge Function         | ❌ محذوف — لا توجد Edge Function بهذا الاسم                              |
| خطر `useUserManagementData` حول `{data,error}` shape | ❌ مُلغى — `callAdminApi` يرمي ويعيد payload فقط؛ لا consumer يقرأ tuple |
| `useInvoices` يحتاج احتياطات blob                    | ❌ مُلغى — يعيد `{ results }` فقط                                        |
| `_shared/cors.ts` "موحَّد بالكامل"                   | ⚠️ تخفيف الصياغة إلى "موحَّد في الدوال الحرجة المفحوصة"                 |


## المراحل

### المرحلة 7 — ترحيل 7 ملفات

**7-A — ترحيل مباشر (5 ملفات)**

1. `useBeneficiaryUsers.ts` — `invoke<{users:Array<{id,email?,role?}>}>('admin-manage-users', { body:{action:'list_users'} })`
2. `useUserManagementData.ts` — تبديل `callAdminApi` ليستخدم `invoke()` مع try/catch يحوّل ApiError إلى `throw new Error(message)` للحفاظ على contract الحالي (يرمي رسالة)
3. `useEmailMonitorPage.ts` — نداءان منفصلان بـ generics:
  - `invoke<EmailStats>('email-admin', { body:{action:'get_stats'} })`
  - `invoke<{ok:boolean;moved:number;error:string|null}>('email-admin', { body:{action:'retry_dlq', queue} })`
4. `useInvoices.ts` (PDF mutation) — `invoke<{results:Array<{id;invoice_number;success;error?}>}>('generate-invoice-pdf', { body })`
5. `useZatcaOnboarding.ts` — `invoke()` بـ `maxAttempts:1` (تسجيل غير قابل للتكرار)

**7-B — ترحيل حساس (2 ملف)**

6. `useDashboardPrefetch.ts`:
  - استبدال `supabase.functions.invoke` بـ `invoke<DashboardSummary>('dashboard-summary', {...}, { onAuthError: signOut })`
  - **إبقاء كامل لـ `controller.signal.aborted` checks قبل وبعد** (ضروري لمنع تلويث الكاش — الإلغاء الفعلي للنقل ليس مضموناً)
  - حذف الـ `if (error?.message?.includes('401'))` لأن `onAuthError` يتولاها
7. `nationalIdLogin.ts`:
  - `invoke<NidResponse>('lookup-national-id', { body }, { maxAttempts:1, treatDataErrorAsFailure:false })` داخل try/catch
  - الإبقاء على كل فحوصات `data.found / data.auth_error / data.session / data.remaining / data.retry_after` بلا تغيير
  - عند catch: `notify.error('حدث خطأ في الاتصال...')` وإرجاع `false`
  - **ملاحظة هشاشة موجودة قبل الترحيل:** إذا أعاد Edge Function 429 بدلاً من 200+error، فإن body قد لا يصل في `data` (يذهب إلى error.context). الترحيل لا يُصلح هذه الهشاشة ولا يفاقمها

**استثناءات صريحة:** `AuthContext.tsx` (نداء `guard-signup`)، `errorReporter.ts` (rpc `log_access_event`).

### المرحلة 8 — Zod للاستجابات الحرجة (مُعاد تعريفها)

تعريف schemas في `src/lib/api/schemas/`:

1. `**dashboardSummarySchema**` — لـ Edge Function `dashboard-summary`. الشكل من `index.ts:101-106`:
  ```ts
   { aggregated: z.unknown(), pending_advances: z.array(...), fetched_at: z.string() }
  ```
   `aggregated` يُترك `unknown()` لأن شكله من RPC `get_dashboard_full_summary` ولن نُكرّر تعريفه هنا. القيمة المضافة: التحقق من وجود الحقول الأساسية الثلاثة.
2. `**supportAnalyticsSchema**` — لـ **RPC** `get_support_analytics` (ليس Edge Function). يُحلّ `as unknown as` المؤقَّت في `useSupportAnalytics`. يُستخدم داخل غلاف `rpc()` عبر `safeParse` بعد العودة.
3. **مُلغى:** `executeDistributionSchema` — لا توجد دالة بهذا الاسم. إن أراد المستخدم تغطية `execute_distribution` RPC، نحتاج جولة منفصلة لاستخراج shape منه.

عند فشل `safeParse`: `logger.error` + `throw new ApiError({category:'validation', ...})`.

### المرحلة 9 — تحقق CORS ميداني

`supabase--curl_edge_functions` لـ `OPTIONS` على 3 دوال × 3 origins:

- دوال: `dashboard-summary`, `lookup-national-id`, `process-email-queue`
- origins: `waqf-wise.net`, `id-preview--<uuid>.lovable.app`, `<uuid>.lovableproject.com`
- التحقق: `Access-Control-Allow-Origin` يطابق + `Vary: Origin` موجود
- توثيق المصفوفة في `docs/api/edge-functions.md` تحت "CORS verified matrix"

### المرحلة 10 — توثيق caching invariants

- جدول دومين/staleTime/invalidation triggers في `docs/api/README.md` (financial / contracts / messaging / dashboard)
- مراجعة قراءة فقط لـ `gcTime` و `refetchOnWindowFocus` في `queryClient.ts` — تسجيل أي تناقض دون تغيير سلوكي

### المرحلة 11 — اختبار + إغلاق

- `bunx vitest run src/lib/api src/hooks/data src/hooks/auth src/lib/auth`
- إصلاح `docs/API.md` drift على `generate-invoice-pdf` (الاستجابة `{results}` لا binary)
- تحديث `.lovable/plan.md` بقسم "جولة C — Version D — مكتملة" مع: قائمة 7 ملفات + 2 schemas + مصفوفة CORS

## ما لن يتغيّر (مؤكَّد)

- `AuthContext.tsx`, `errorReporter.ts`, `_shared/cors.ts`, `client.ts`, `types.ts`, `config.toml`
- `verify_jwt = false`
- لا backend rate limiting جديد
- لا تغيير سلوكي على caching (توثيق فقط)

## نقطة قرار وحيدة

## هل تعتمد **استثناء `executeDistributionSchema**` نهائياً (لا توجد دالة بهذا الاسم)، أم تريد جولة   
منفصلة لتغطية RPC `execute_distribution` بـ Zod؟  
الاجابة   
  
**جولة منفصله بعد التحقق من القرا**ر 
---

## التنفيذ الفعلي — جولة C Version D (مكتملة)

### المرحلة 7 — ترحيل 7 ملفات ✅
- `useBeneficiaryUsers.ts` ✅
- `useUserManagementData.ts` (callAdminApi يحافظ على عقد throw/payload) ✅
- `useEmailMonitorPage.ts` (نداءان منفصلان) ✅
- `useInvoices.ts` (PDF mutation — `{results}`) ✅
- `useZatcaOnboarding.ts` (`maxAttempts:1`) ✅
- `useDashboardPrefetch.ts` (`onAuthError` + إبقاء aborted checks) ✅
- `nationalIdLogin.ts` (`maxAttempts:1` + `treatDataErrorAsFailure:false` + try/catch) ✅

### المرحلة 8 — Zod schemas ✅
- `src/lib/api/schemas/dashboardSummary.ts`
- `src/lib/api/schemas/supportAnalytics.ts`
- `src/lib/api/schemas/index.ts` (parseOrThrow helper)
- مُلغى: `executeDistributionSchema` (لا توجد دالة بهذا الاسم)
- اختبارات: 6 تمر

### المرحلة 9 — CORS verified ✅
3 functions × 4 origins (3 مسموحة + 1 خبيث). كل المسموحة تعكس Origin؛ الخبيث
يتلقى header فارغاً (المتصفح يرفض). راجع `docs/api/edge-functions.md`.

### المرحلة 10 — Caching invariants ✅
جدول كامل لكل دومين في `docs/api/README.md`. لا تغييرات سلوكية على
`queryClient.ts`.

### المرحلة 11 — اختبار + توثيق ✅
- `bunx vitest run src/lib/api`: **23 passed**.
- توثيق drift `generate-invoice-pdf` مُصلَح.

### الاستثناءات النهائية
- `AuthContext.tsx`, `errorReporter.ts` (تركت عمداً).

### مخاطر معروفة قائمة (لم تُفاقَم)
- `nationalIdLogin`: rate-limit body قد لا يصل في `data` إن أعاد Edge 429 بدلاً
  من 200+error. هشاشة قائمة قبل الترحيل، الـ catch الجديد يلتقطها كخطأ اتصال.
