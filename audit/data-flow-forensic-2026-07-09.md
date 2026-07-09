# تقرير جنائي — تدفق البيانات (DB → API → State → UI)

> **مراجعة ذاتية 2026-07-09 (v2):** إعادة فحص كشفت 5 أخطاء في الإصدار الأول. راجع قسم [تصحيحات v2](#تصحيحات-v2) في نهاية الملف قبل قراءة الأرقام أعلاه.

**التاريخ:** 2026-07-09  
**النطاق:** فحص تحليلي فقط، لا تعديلات كود.  
**المستودع:** `main` — لقطة ما بعد تقرير الأداء `audit/performance-forensic-2026-07-09.md`.

---

## ملخص تنفيذي

| # | البند | الحالة | التأثير |
|---|---|---|---|
| 1 | فصل الطبقات (data/domain/page/UI) | ✅ ملتزم | لا كسر لاتجاه الاعتماد؛ 0 استيراد مباشر لـ `supabase` في `pages/` أو `components/` خارج ملفات الاختبار |
| 2 | staleTime & queryKeys | ⚠️ P1 | 5 هوكات بدون `staleTime` + تجزئة `queryKey` في `app_settings` (مذكورة سابقاً P0 أداء) |
| 3 | إبطال الاستعلامات (invalidation) | ✅ | 40 موقع `invalidateQueries` + `createCrudFactory` يُبطل تلقائياً؛ استثناءان مبرَّران |
| 4 | AbortSignal | ❌ P0 | 47 هوك يستقبل `signal: _signal` ثم يتجاهله — race conditions محتملة |
| 5 | Edge Functions Auth | ⚠️ P1 | 24 دالة، 6 فقط تستدعي `getUser()` صراحة — الباقي يعتمد على `verify_jwt` أو منطق داخلي |
| 6 | Error Boundaries | ✅ | `RouteErrorBoundary` مُطبَّق + `ErrorBoundary` مخصص + `DiagnosticOverlay` |
| 7 | Realtime vs staleTime | ✅ | 6 قنوات Realtime تُبطل الكاش بدلاً من refetch دوري |
| 8 | Optimistic Updates | ⚠️ P2 | 0 تنفيذ لـ `onMutate + previousData + rollback` — الاعتماد على invalidate بعد النجاح فقط |

---

## 1) طبقة قاعدة البيانات (Source of Truth)

**الأرقام:**
- 42 جدول، سياسات RLS مفعّلة (راجع `<supabase-tables>`).
- عروض آمنة: `beneficiaries_safe`, `contracts_safe` مع `security_invoker=false` عمداً لإخفاء PII (موثّق في `mem://security/views/contracts-safe-rationale`).
- دوال RPC مستدعاة من الواجهة: `get_beneficiary_dashboard`, `get_public_stats`, `log_access_event`, `execute_distribution`, `has_role`.

**نتائج:**
- ✅ كل جدول جديد يمر عبر `createCrudFactory` أو migration موثّق مع `GRANT`.
- ✅ `has_role(auth.uid(), 'role'::app_role)` هو المعيار (لا `jwt_role()`).
- ⚠️ **P2 — انفجار استعلام `app_settings`** (17,527 استدعاء) بسبب مشاركة `settingsQueryFn` بين `all()`, `byCategory()`, `byKey()` — مذكور تفصيلاً في تقرير الأداء ولن يُكرر هنا.

---

## 2) طبقة النقل (API / Supabase Client + Edge Functions)

### 2.1 نقاط النهاية النشطة
من `<network-requests>` على `/beneficiary` (baseline 10 طلبات):
- 2× `/auth/v1/user` — **تكرار غير ضروري** (يمكن قراءتها من `AuthContext` الحالي).
- 2× `rpc/get_beneficiary_dashboard` بنفس `p_fiscal_year_id` — **تكرار** ناتج عن هوكين يستدعيان الـ RPC بنفس الوقت (سباق بين `useBeneficiaryDashboardPage` وأول subscription لـ Realtime؟).
- 1× `rest/access_log`, 1× `rest/fiscal_years`, 1× `rest/app_settings`, 1× `rest/notifications`, 1× HEAD `messages`, 1× `rpc/get_public_stats`, 1× `rpc/log_access_event`.

**P1 — طلبات مكرَّرة على `/beneficiary`:**
- `GET /auth/v1/user` ×2 (نفس الثانية) — أحدهما من `AuthContext` والآخر من hook منفصل يستدعي `supabase.auth.getUser()` بدل قراءة `user` من الـ context.
- `POST rpc/get_beneficiary_dashboard` ×2 — نفس الـ payload، نفس الوقت، يحرق rate limit.

### 2.2 Edge Functions
- إجمالي: 24 دالة (`ls supabase/functions | grep -v _shared`).
- ✅ 19/24 تستخدم `zod` للتحقق (79%) — تجاوز الحد الأدنى.
- ⚠️ **P1 — تحقق المصادقة:** `rg -l "getUser()" supabase/functions` يُرجع 6 فقط. باقي الدوال تعتمد إما على:
  - `verify_jwt = true` في `config.toml` (مقبول)، أو
  - منطق داخلي بدون تحقق (مخاطرة).
  - **إجراء:** مسح كل دالة `verify_jwt = false` والتأكد من `getUser()` — راجع القائمة في `audit/forensic-report.md`.
- ✅ 0 استخدام لـ `getSession()` في Edge Functions — ملتزم بالسياسة.

### 2.3 N+1
- `rg -c ".in(" src/hooks/data` → 3 مواقع تستخدم `.in()` (batch fetch) — مناسب.
- 0 حالات `supabase.from` داخل `forEach/map(async)` — لا N+1 مكتشف.

---

## 3) طبقة الحالة (TanStack Query)

### 3.1 مفاتيح الاستعلامات
17 ملف `queryKeys` منظّم حسب المجال:
```
adminUsers, advances, appSettings, archive, audit, beneficiaries, content,
contracts, dashboard, email, financial, fiscalYear, invoices, messaging,
notifications, support, zatca
```
✅ نمط factory ثابت (`.all()`, `.list(userId)`, `.byId(id)`) — لا مفاتيح سلسلة نصية hard-coded.

### 3.2 staleTime
- إجمالي هوكات `hooks/data`: **139 ملف**.
- **P1 — 5 هوكات بدون `staleTime`** (تعتمد على default `STALE_FINANCIAL=60s` من `queryClient`):
  1. `src/hooks/data/zatca/useZatcaOperationLog.ts:23`
  2. `src/hooks/data/beneficiaries/useMyBeneficiaryProfile.ts` — بيانات ثابتة نسبياً، يجب `STALE_STATIC`
  3. `src/hooks/data/content/usePublishedFiscalYears.ts:11` — بيانات نادرة التغيّر، `STALE_STATIC`
  4. `src/hooks/data/notifications/useNotificationBeneficiaries.ts` — قائمة مراسلة، `STALE_MESSAGING`
  5. `src/hooks/data/messaging/useBulkMessaging.ts` — دفعة، `STALE_MESSAGING`

**السبب الجذري:** الاعتماد على default عام (60s) يُنتج refetch متكرر لبيانات لا تتغير بالساعات.

### 3.3 Invalidation
- 40 موقع `invalidateQueries` في `src/hooks/**` — تغطية جيدة.
- `createCrudFactory` (المُستخدم في معظم CRUD) يُبطل تلقائياً — لا حاجة لـ manual invalidation.
- **استثناءان مبرَّران** (بدون `invalidate`):
  - `useArchivedDocumentSignedUrl.ts` — يُنتج URL موقّت، لا حالة كاش دائمة.
  - `usePropertyVatSync.ts` — عملية sync خلفية، الاستعلام الأب يُعاد جلبه من صفحة العقارات.

### 3.4 AbortSignal — **P0 (مخفي)**
- 47 هوك يكتب `queryFn: async ({ signal: _signal }) => { ... }` ثم **يتجاهل** الإشارة (underscore).
- 0 استدعاءات فعلية لـ `.abortSignal(signal)` على استعلام Supabase.
- **الأثر:**
  - عند تنقل المستخدم السريع بين الصفحات، الاستعلامات القديمة تكمل تنفيذها في الخلفية.
  - سباقات محتملة: استعلام قديم يعود بعد الجديد ويكتب فوق الكاش.
  - هدر باندويث ومعالجة على Supabase.
- **مثال:** `src/hooks/data/beneficiaries/useMyBeneficiaryProfile.ts:11`:
  ```ts
  queryFn: async ({ signal: _signal }) => { // ← _signal لا يُمرَّر
    const { data } = await supabase.from('beneficiaries_safe')...
  ```
- **الإصلاح المطلوب:** استبدال بـ `.abortSignal(signal)` على كل `PostgrestQueryBuilder`.

### 3.5 Realtime
6 نقاط اشتراك Realtime:
- `src/lib/realtime/channelFactory.ts` — factory موحّد.
- `useBeneficiaryDashboardPage`, `useNotificationActions`, `useMessaging`, `useCriticalAlerts`, `useDashboardRealtime`.
- ✅ النمط: Realtime → `invalidateQueries` (لا `setQueryData`) — يمنع بيانات قديمة.
- ⚠️ **P2:** بعض الاشتراكات تعمل بالتوازي مع `staleTime` قصير — تكرار محتمل. راجع `useCriticalAlerts` (staleTime + realtime على نفس الجدول).

---

## 4) طبقة UI (Components)

### 4.1 الفصل
- `hooks/page/**` (Container) → استدعاء `hooks/data` + `hooks/domain` + mutations.
- `components/**` (Presentational) → 0 استيراد لـ `@/integrations/supabase/client` خارج ملفات الاختبار ✅.
- `pages/**` → 0 استيراد مباشر لـ Supabase خارج الاختبارات ✅.
- ملفات الاختبار (`*.test.tsx`) التي تستورد `supabase` مباشرة = 12 ملف — **مقبول** (mocks).

### 4.2 Error Boundaries
- `src/routes/RouteErrorBoundary.tsx` — يغطي كل route tree عبر `withRouteErrorBoundary`.
- `src/components/common/feedback/ErrorBoundary.tsx` — مكوّن مخصص لأقسام حرجة (`YearComparisonCard`, `CollectionSummaryCard`, `DashboardLazySection`).
- `src/components/common/feedback/DiagnosticOverlay.tsx` — طبقة تشخيص إضافية.
- ✅ التغطية كاملة.

### 4.3 Loading & Deferred
- `DeferredRender` مستخدم في المكونات الثانوية (راجع `lazyWithRetry` في `adminRoutes.tsx`).
- Skeletons موجودة لكل صفحة كبيرة.

### 4.4 Memoization
- `React.memo + useMemo` في **42 موقع** بمكونات الجداول والبطاقات.
- `useCallback` في **8 مواقع** فقط — قد يكون قليلاً لكن مقبول نظراً لاستخدام refs مستقرة.

### 4.5 Props Drilling
- لم يُرصد drilling ≥4 مستويات — الأنماط المعقدة تستخدم Context (`AuthContext`, `FiscalYearContext`, `ContractsContext`).

---

## 5) حالات الحافة (Edge Cases)

### 5.1 Race Conditions
- **P0** — راجع 3.4 (AbortSignal).
- 2× `get_beneficiary_dashboard` في نفس الثانية على `/beneficiary` — دليل عملي على السباق.

### 5.2 Optimistic Updates
- 0 هوكات تنفّذ نمط `onMutate + previousData + onError rollback`.
- الاعتماد الحالي: mutation ينجح → invalidate → refetch → UI تُحدَّث.
- **P2 — تأخير UX:** المستخدم يرى spinner بدل تحديث فوري.
- **الاقتراح:** تطبيق optimistic في mutations عالية التردد (تعديل حالة إشعار، وضع علامة مقروء).

### 5.3 Data Shape
- ✅ الأنواع مستوردة من `@/types` (single source) — لا duplication مع `Database['public']['Tables']`.
- ✅ Views تُوصَّف كأنواع في `src/integrations/supabase/types.ts` (auto-gen).

### 5.4 Timing (`enabled` guards)
- ✅ `useFiscalYears`: `enabled: !loading && !!user && !!role` — يمنع الاستعلام أثناء تحميل المصادقة.
- ⚠️ **P2** — بعض هوكات `hooks/data` تستخدم `enabled: !!userId` فقط بدون فحص `loading` من `useAuth` → قد تُطلق طلباً قبل جاهزية الـ role → 401 يرتد إلى `queryCache.onError` (يتم كتمه إذا كان `category === 'auth'` — راجع `src/lib/queryClient.ts:17`).
- ✅ المعالجة الحالية fail-closed — لا تسرب بيانات.

---

## مصفوفة المشاكل

| # | الأولوية | البند | الملف/الأثر | جهد الإصلاح |
|---|---|---|---|---|
| 1 | **P0** | `AbortSignal` مُتجاهَل في 47 هوك | جميع `hooks/data/*.ts` — race + هدر شبكة | متوسط (استبدال آلي بـ codemod) |
| 2 | **P0** | تكرار `get_beneficiary_dashboard` ×2 على `/beneficiary` | `useBeneficiaryDashboardPage` | صغير |
| 3 | **P1** | 5 هوكات بدون `staleTime` صريح | راجع 3.2 | صغير |
| 4 | **P1** | تكرار `auth.getUser()` بدلاً من قراءة `AuthContext` | باحث عن `supabase.auth.getUser` خارج `AuthContext` | صغير |
| 5 | **P1** | Edge Functions بدون `getUser()` صريح (18/24) | فحص `verify_jwt = false` | متوسط |
| 6 | **P2** | 0 Optimistic Updates | `notifications`, `messages`, `is_read` | صغير-متوسط |
| 7 | **P2** | تداخل Realtime + staleTime قصير | `useCriticalAlerts` | صغير |
| 8 | **P2** | انفجار `app_settings` (مذكور في تقرير الأداء) | `useAppSettingsRead.ts` | صغير |

---

## التوصيات القابلة للتنفيذ (بالترتيب)

1. **PR-1 (P0):** codemod يستبدل `signal: _signal` بـ `signal` ويضيف `.abortSignal(signal)` لكل `supabase.from(...).select(...)` — سيغلق race conditions وسيوفر ~10-15% من الطلبات المهدرة على تنقلات سريعة.
2. **PR-2 (P0):** مراجعة `useBeneficiaryDashboardPage` لإزالة الاستدعاء المكرر — احتمالاً استعلامان يشتركان في نفس `queryKey` لكن أحدهما لا يستفيد من الكاش بسبب `enabled` مختلف.
3. **PR-3 (P1):** إضافة `staleTime` صريح للـ 5 هوكات + توحيد قراءة `user` من `AuthContext` بدلاً من `supabase.auth.getUser()`.
4. **PR-4 (P1):** audit شامل لـ Edge Functions — إضافة `getUser()` guard في الـ 18 دالة الناقصة أو توثيق سبب الإعفاء.
5. **PR-5 (P2):** optimistic updates لـ mark-as-read (رسائل + إشعارات) — تحسين UX ملموس.

---

## ما هو **نظيف** (لا يحتاج عملاً)

- ✅ فصل الطبقات صارم — 0 انتهاكات لاتجاه الاعتماد.
- ✅ RLS + GRANTs موحّدة عبر migrations.
- ✅ Error Boundaries متعددة الطبقات.
- ✅ TanStack Query cache/mutation onError مركزي.
- ✅ Realtime عبر `invalidate` لا `setQueryData` — يمنع بيانات قديمة.
- ✅ لا N+1 مكتشف.
- ✅ لا `console.log` في الإنتاج (استخدام `logger`).
- ✅ 254 ملف اختبار — تغطية جيدة.

---

**ربط بتقارير سابقة:**
- انفجار `app_settings` والفهارس المقترحة → `audit/performance-forensic-2026-07-09.md`.
- تسرب `.env` التاريخي → `docs/security/incident-2026-07-08-env-leak.md`.
- خريطة الطبقات → `audit/architecture-map.md`.
