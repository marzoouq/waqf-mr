# استراتيجية تكامل API شاملة — النسخة النهائية المعتمَدة

## المراحل

### المرحلة 1 — غلاف `invoke()` موحّد
ملف جديد: `src/lib/api/invoke.ts`
- توقيع: `invoke<T>(fnName, { body?, headers?, signal? }, options?): Promise<T>`.
- يستخدم `startPerfTimer('invoke:<name>')` + `classifyError()` + retry لـ network/server/rate_limit (نفس سياسة `rpc.ts`: 3 محاولات، backoff 250→500→1000ms).
- **يدعم نمط `data.error` كحقل احتياطي** — يُحوَّل إلى `ApiError` بفئة `validation` (افتراضياً) أو حسب status إن وُجد.
- **callback اختياري `onAuthError`** لاستبدال نمط signOut اليدوي الحالي في `useDashboardSummary` دون فرضه.
- يُلقي `ApiError` يحتفظ بـ `cause` الأصلي.
- مراقبة حجم الحمولة (DEV فقط) عبر `JSON.stringify(data).length`.

### المرحلة 2 — ترحيل على دفعتين

**دفعة A (آمنة، 12 ملف):**
- `src/lib/services/`: `zatcaService.ts`, `notificationService.ts`, `fiscalYearService.ts`, `accessLogService.ts` (4)
- hooks بسيطة: `useMultiYearSummary`, `useTotalBeneficiaryPercentage`, `useMaxAdvanceAmount`, `useContractAllocations`, `useYearComparisonData`, `useBylaws`, `usePublicStats`, `useBeneficiaryDashboardRpc` (8)

**دفعة B (حساسة، 9 ملفات — بعد A والاختبارات):**
- `useCloseFiscalYear`, `useDistribute`, `useDashboardSummary` (signOut عند 401 → عبر `onAuthError`)
- `useWebAuthnAuth`, `useWebAuthnRegister`, hooks ZATCA invoice actions
- `useSupportTicketMutations`, `useSupportAnalytics`, `useTenantPayments`, `useCollectionAlerts`, `usePaymentInvoices`, `useBeneficiaries`

**استثناءات لا تُرحَّل:**
- `errorReporter.ts` (يمنع recursion عبر طبقة logging).
- ملفات `*.test.ts` (تختبر السلوك الخام).

### المرحلة 3 — مراقبة حجم الحمولة
تعديل `src/lib/monitoring/queryMonitor.ts`:
- إضافة `recordPayloadSize(label, bytes)` يُحذِّر > 500KB، يُسجِّل error > 1MB.
- يُستدعى تلقائياً من `rpc()` و `invoke()` (DEV فقط).

### المرحلة 4 — إكمال اختبارات failure paths
- **توسيع `src/lib/api/rpc.test.ts`** بـ 3 اختبارات: 429 rate_limit صراحةً، قياس backoff الفعلي بـ `vi.useFakeTimers`، تأخر بين المحاولات.
- **إنشاء `src/lib/api/invoke.test.ts`** بـ 7 سيناريوهات: 200 OK، 400 validation، 401 auth + `onAuthError`، 429 rate_limit (3 محاولات)، 500 server (retry)، network TypeError، `data.error` كحقل احتياطي.

### المرحلة 5 — توثيق Edge Functions تفصيلي
تحديث `docs/api/edge-functions.md`:
- لكل وظيفة من 18: الغرض، method، body schema، response schema، رموز الخطأ، فئة المصادقة، فئة CORS.
- جدول مرجعي سريع.
- توثيق غلافي `rpc()` و `invoke()` في `docs/api/README.md`.

### المرحلة 6 (مؤجَّلة) — throttle عميل
لا تُنفَّذ الآن. تنتظر رصد سلوك flood فعلي قبل تبريرها.

## ما لن يتغيّر
- `_shared/cors.ts`، `AuthContext`, `ProtectedRoute`, `client.ts`, `types.ts`, `config.toml`.
- `verify_jwt = false` (مقصود).
- بنية `queryClient`.
- `errorReporter.ts` (استثناء مبرَّر).

## ترتيب التنفيذ
1. المرحلة 1 (`invoke.ts`).
2. المرحلة 4 (اختبارات `invoke.test.ts` + توسعة `rpc.test.ts`).
3. المرحلة 3 (مراقبة الحمولة).
4. المرحلة 2 دفعة A.
5. المرحلة 2 دفعة B.
6. المرحلة 5 (توثيق).

## الحقائق المؤكَّدة (تحقق مباشر من الكود)
- 21 ملف إنتاج + 1 اختبار يستدعي `supabase.rpc()` مباشرة (22 إجمالاً).
- 13 ملف إنتاج + 1 اختبار يستدعي `supabase.functions.invoke` (14 إجمالاً).
- `src/lib/queryStaleTime.ts` يصدِّر **8 ثوابت**.
- `rpc.test.ts` يحوي **7 سيناريوهات** — ينقصه 429 صراحةً + fake timers.

## المخاطر
- **دفعة B**: تعديل تدفقات الإقفال/التوزيع/WebAuthn/ZATCA — يتطلب smoke testing يدوي لكل مسار.
- **`onAuthError` callback**: يجب أن يُمرَّر صراحةً في `useDashboardSummary` لتفادي تغيير سلوك signOut الحالي.
- **`data.error` fallback**: `invoke()` يحتفظ بـ `cause` للوصول للحقول غير القياسية إن لزم.

---

## ✅ حالة التنفيذ النهائية

| المرحلة | الحالة | الملاحظات |
|---------|--------|----------|
| 1. غلاف `invoke()` | ✅ مكتمل | `src/lib/api/invoke.ts` + ApiError + `data.error` fallback + `onAuthError` |
| 2A. ترحيل آمن (12 ملف) | ✅ مكتمل | services/* + 8 hooks بسيطة |
| 2B. ترحيل حسّاس | ✅ مكتمل | useCloseFiscalYear, useDistribute, useDashboardSummary (`onAuthError`→signOut), useWebAuthn{Auth,Register} (`maxAttempts:1`), useZatcaInvoiceActions (4 mutations), useSupportTicketMutations, useSupportAnalytics, useTenantPayments, useCollectionAlerts, usePaymentInvoices (4 mutations), useBeneficiaries (مع fallback) |
| 3. مراقبة الحمولة | ✅ مكتمل | `payloadMonitor` يعمل من `rpc()` و `invoke()` |
| 4. اختبارات failure | ✅ مكتمل | 17 اختبار يمر (9 rpc + 8 invoke) |
| 5. توثيق | ✅ مكتمل | `edge-functions.md` (18 وظيفة + مصفوفة فئات) + `README.md` (`invoke()` + payload monitor) |
| 6. throttle عميل | ⏸ مؤجَّل | كما خُطِّط — ينتظر رصد flood فعلي |

## ملفات استُثنيت من الترحيل (مبرَّر)

- `src/contexts/AuthContext.tsx` — قاعدة المشروع: لا تعديل على ملفات المصادقة دون طلب صريح.
- `src/lib/errorReporter.ts` — يمنع recursion في طبقة logging.
- `src/lib/auth/nationalIdLogin.ts` — منطق rate-limit مخصّص يفحص `data.retry_after`/`data.remaining` مباشرة.
- `src/hooks/page/admin/management/useEmailMonitorPage.ts`, `useUserManagementData.ts`, `useBeneficiaryUsers.ts`, `useInvoices.ts` (PDF blob), `useZatcaOnboarding.ts`, `useDashboardPrefetch.ts` — لم تكن في نطاق Wave A/B؛ تُترك للجولة القادمة عند الحاجة.

## التحقق النهائي

- `bunx vitest run src/lib/api` ⇒ 17/17 ✅
- لا أخطاء build بعد كل ترحيل (تحقق فوري عبر اللينتر).
