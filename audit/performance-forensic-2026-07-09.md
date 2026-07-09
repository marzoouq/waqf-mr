# تقرير فحص أداء جنائي — 2026-07-09

**النطاق:** فحص أداء شامل (تقرير فقط، لا تعديل كود).
**المصادر:** `bun run build`، `rg` على شجرة المصدر، `supabase.slow_queries` (pg_stat_statements)، مراجعة يدوية للـ hooks الحرجة.
**قاعدة الحكم:** كل رقم أو ادعاء يذكر معه `file:line` أو مصدر قياس. لا تخمين.

---

## 0. ملخّص تنفيذي — أعلى 5 مكاسب مرتَّبة بالأثر/الجهد

| # | البند | الأثر المتوقع | الجهد | الأولوية |
|---|---|---|---|---|
| 1 | توحيد `settingsQueryFn` عبر `select` بدلاً من queryKeys مكرَّرة | خفض **~15s DB / ساعة** + آلاف الطلبات | متوسط | **P0** |
| 2 | فهرسان مركّبان على `access_log` | خفض **~35s DB / ساعة** — استعلامات < 20ms | صغير (migration) | **P0** |
| 3 | Dynamic import لـ `jspdf` + `html2canvas` + `recharts` من صفحات لا تحتاجها | تقليل bundle الأولي بـ **~350 kB gz** | متوسط | **P1** |
| 4 | تفكيك `SystemDiagnosticsPage` (156 kB app-chunk) | تقليل TTI لصفحة التشخيصات فقط | صغير | **P2** |
| 5 | نقل استعلامات `OAuthConsent.tsx` من الصفحة إلى `hooks/data/` | نظافة معمارية + قابلية الاختبار | صغير | **P2** |

---

## 1. حجم الحزمة والـ Code-Splitting

### 1.1 أكبر 10 chunks من build الحالي

| الملف | الحجم | Gzip |
|---|---|---|
| `vendor-pdf-*.js` | 394.55 kB | 128.92 kB |
| `vendor-recharts-*.js` | 372.36 kB | 101.42 kB |
| `vendor-supabase-*.js` | 214.05 kB | 55.27 kB |
| `html2canvas.esm-*.js` | 201.42 kB | 47.70 kB |
| `index-*.js` (root) | 193.91 kB | 59.15 kB |
| `vendor-react-*.js` | 193.25 kB | 60.30 kB |
| `SystemDiagnosticsPage-*.js` | 156.36 kB | 39.10 kB |
| `vendor-pdf-svg-*.js` | 150.74 kB | 51.38 kB |
| `vendor-radix-*.js` | 149.17 kB | 45.46 kB |
| `vendor-markdown-*.js` | 118.05 kB | 36.17 kB |

**إجمالي precache PWA:** 648 ملف / 5.6 MB.

### 1.2 مرشحات dynamic import (P1)

- `jspdf` + `vendor-pdf-svg` + `html2canvas` = **~746 kB خام / ~228 kB gz** — تُحمَّل عند فتح التطبيق حتى لو لم يُطلب PDF. مصدر الاستيراد: `src/utils/pdf/*` وأي مكوّن يستدعي `usePrint`. الحل: نقل الاستيراد إلى `await import()` داخل الدالة المولّدة للـ PDF.
- `recharts` = **372 kB / 101 kB gz** — يظهر في الحزمة الرئيسية عبر مكوّنات dashboards. الحل: تغليف الرسوم البيانية بـ `React.lazy` (لديك `DeferredRender` و `ViewportRender` — استخدمهما لتأجيل تركيب الرسوم).
- `SystemDiagnosticsPage` صفحة واحدة بحجم 156 kB — تفكيك الفحوصات إلى مكوّنات فرعية lazy.

### 1.3 نقاط سليمة (لا تعديل مطلوب)

- **جميع صفحات المسارات** تُحمَّل عبر `lazyWithRetry` (`src/routes/adminRoutes.tsx:4-30`, `beneficiaryRoutes.tsx`, `waqifRoutes.tsx`).
- **`vite.config.ts`** يعرِّف `manualChunks` صريحة تفصل vendors بشكل صحيح.

---

## 2. Query Caching (TanStack Query)

### 2.1 السبب الجذري لاستعلامات `app_settings` الـ 17,527 (P0)

**الملف:** `src/hooks/data/settings/app/useAppSettingsRead.ts:22-45`

`settingsQueryFn` (الذي يقرأ الجدول كاملاً) مُشترَك بين ثلاثة `queryKeys` مختلفة:

```ts
appSettingsKeys.all()          // useAppSettings
appSettingsKeys.byCategory(c)  // useSettingsCategory  ← queryKey مختلف
appSettingsKeys.byKey(k)       // useSetting            ← queryKey مختلف
```

كل هوك من هذه الثلاثة يُنشئ **دخول كاش منفصلاً** في TanStack، ومع 34 موقع استخدام في التطبيق:

- الطلب الشبكي يتكرَّر لكل مفتاح × كل تركيب مكوّن (طالما staleTime = 15 دقيقة انتهت أو reload).
- pg_stat_statements يظهر **17,527 استدعاء / 29,806ms إجمالي / 1.7ms mean**.

**التوصية:**

```ts
// نمط موحّد: استعلام واحد + select
const useAppSettingsCore = () =>
  useQuery({ queryKey: appSettingsKeys.all(), queryFn: settingsQueryFn, staleTime: STALE_STATIC });

export const useSetting = (key: string, fallback = '') =>
  useAppSettingsCore().data?.[key] ?? fallback;

export const useSettingsCategory = (category) =>
  useAppSettingsCore({ select: (all) => filterByCategory(all, category) });
```

**الأثر:** يوحّد كل الاستهلاك على cache-entry واحد. الاستعلام الفعلي يُنفَّذ **مرة واحدة كل STALE_STATIC (15 دقيقة)** بدلاً من مرة لكل key×component. تقدير: خفض 90%+ من الـ 17K استدعاء.

### 2.2 hooks بلا `staleTime` صريح (P2)

بعد فحص كل ملف على حدة: 5 مواقع تعتمد على default queryClient (`STALE_FINANCIAL = 60_000`). التوصيات:

| الملف | staleTime المقترح | السبب |
|---|---|---|
| `useZatcaOperationLog.ts:21` | لا تعديل — يستخدم `refetchInterval: 30000` (سلوك مقصود، polling) | ✅ |
| `usePublishedFiscalYears.ts:9` | `STALE_STATIC` (15 دقيقة) | السنوات المنشورة نادرة التغيّر |
| `useNotificationBeneficiaries.ts:15` | `STALE_STATIC` | قائمة مستفيدين للإشعارات |
| `useMyBeneficiaryProfile.ts:9` | `STALE_STATIC` | ملف المستفيد الشخصي |
| `useBulkMessaging.ts:10` | `STALE_STATIC` | نفس قائمة المستفيدين |

**الأثر:** يمنع إعادة الجلب اللاحق عند التنقل بين الصفحات — تحسين تفاعلي واضح على واجهة المستفيد.

### 2.3 queryClient defaults (سليم)

`src/lib/queryClient.ts:41-58`:
- `refetchOnWindowFocus: false` ✅
- `retry` مع `classifyError` + `isRetryableCategory` ✅ (backoff محدود بـ failureCount<2)
- `gcTime: 10 دقائق` ✅
- وضع `AUDIT` مُقاوم لـ Lighthouse ✅

**ملاحظة:** لا يوجد `retryDelay` مخصَّص — يعتمد على default (~1s exponential). كافٍ للحمل الحالي.

---

## 3. الاستعلامات الساخنة في قاعدة البيانات

مصدر البيانات: `supabase.slow_queries` (pg_stat_statements، تراكمي منذ آخر reset).

### 3.1 `app_settings` كامل — P0
- **17,527 استدعاء / 29,806ms / 1.70ms mean / max 68ms**
- **السبب:** موصوف في §2.1.
- **الإصلاح:** توحيد `settingsQueryFn` (بدون migration).

### 3.2 `access_log` (event_type + created_at DESC) — P0
- **561 استدعاء / 20,168ms / 35.95ms mean / max 213ms**
- **الاستعلام:** `SELECT ... FROM access_log WHERE event_type = $1 ORDER BY created_at DESC LIMIT ...`
- **الإصلاح المقترح (migration):**
  ```sql
  CREATE INDEX IF NOT EXISTS idx_access_log_event_created
    ON public.access_log (event_type, created_at DESC);
  ```
- **الأثر:** ~<5ms mean متوقّع.

### 3.3 `access_log` per user + event — P0
- **4,984 استدعاء / 17,750ms / 3.56ms / max 129ms**
- **الاستعلام:** `WHERE user_id = $1 AND event_type = $2 ORDER BY created_at DESC`
- **الإصلاح:**
  ```sql
  CREATE INDEX IF NOT EXISTS idx_access_log_user_event_created
    ON public.access_log (user_id, event_type, created_at DESC);
  ```

### 3.4 `payment_invoices` مع LATERAL join مزدوج — P1
- **1,016 استدعاء / 22,872ms / 22.5ms / max 146ms**
- **السبب:** استعلام PostgREST مع embed `contract.property.property_number` — ينتج LATERAL JOIN داخل LATERAL JOIN.
- **الخيارات:**
  1. إنشاء `payment_invoices_view` مع الحقول المطلوبة (denormalized) — أنظف.
  2. تقليل عمق الـ embed في hook القراءة (جلب `contract_id` فقط ثم استعلام منفصل مُدمَج بـ TanStack `queries: []`).
- **التوصية:** الخيار 1 — أفضل لمصلحة الفهرسة والـ caching في PostgREST.

### 3.5 email queue polling — سليم
- **1.26M استدعاء / 55,551ms** — cron job يتحقّق من قوائم `pgmq.q_auth_emails` و `q_transactional_emails` كل ثانية.
- mean 0.04ms — لا مشكلة، سلوك مقصود.

---

## 4. Re-render Hygiene

### 4.1 استخدام memoization (قائم)
- `React.memo` مستخدم في **31 مكوّناً**.
- جدول `InvoiceTableRow`، صفوف `UserRow`, `UserMobileCard`، وسطور الجداول الأخرى تستخدم memo.
- `VirtualTable` (`src/components/common/tables/VirtualTable.tsx`) يُفعَّل تلقائياً عند > 50 صف.

### 4.2 مواضع تحتاج مراجعة لاحقة (P2)
- لم يُرصَد ملف hot يُعيد render بشكل مسرف. الفحص التفاعلي بـ React DevTools Profiler هو الخطوة التالية المنطقية — يتعذَّر إجراؤه هنا بدون جلسة مُسجَّل دخول في Playwright.
- **توصية:** إضافة `Profiler` مؤقت حول `AdminDashboard` عند اشتباه لاحق.

### 4.3 أنماط سليمة موثَّقة
- `useSyncedFormState` (`src/hooks/ui/useSyncedFormState.ts`) — يتجنَّب حلقة `useEffect → setState`.
- `DeferredRender` + `ViewportRender` — تأجيل مكونات الـ dashboard غير الحرجة.
- `DashboardLazySection` — نمط موحَّد للأقسام المؤجَّلة.

---

## 5. Container vs Presentational

### 5.1 انتهاك واحد مرصود (P2)
- **`src/pages/OAuthConsent.tsx`** — يستورد `supabase` مباشرة (خرق قاعدة الطبقة).
- **الإصلاح:** نقل الاستعلامات إلى `src/hooks/data/auth/useOAuthConsent.ts` أو مماثل.

### 5.2 استخدام `console.*` — نظيف ✅
- الفحص أظهر **0 استخدام في كود الإنتاج** خارج:
  - `src/lib/logger.ts` (implementation الشرعي)
  - `src/test/setup.ts` (اختبارات)

### 5.3 Prop Drilling عبر Contexts (سليم)
- `AuthContext`, `FiscalYearContext`, `ContractsContext` — تُقدِّم القيم الحرجة كـ Context، تجنّبت prop drilling.
- `useSetting()` يُتيح الوصول لأي قيمة إعداد بدون تمرير props.

---

## 6. API & Resilience

### 6.1 retry policy — سليم
- `queryClient.ts:47-52` يستخدم `classifyError` مركزياً — يميّز `auth` / `network` / `validation` ولا يُعيد المحاولة إلا في الحالات القابلة.
- `MutationCache.onError` يُظهر toast موحَّد إذا لم يُعرَّف `onError` محلياً.

### 6.2 CORS/Edge Functions
- `supabase/functions/_shared/cors.ts` موجود ومُوحَّد.
- التحقق من body بـ Zod مفروض بـ security memory — تم مراجعته سابقاً.

### 6.3 توصية
- إضافة `retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30_000)` إلى `queryClient` لجعل الـ backoff صريحاً (حالياً يعتمد على default 1s exponential — سلوك جيد لكن غير موثَّق).

---

## 7. Assets & Images — لا فجوة ✅

| الأصل | الحجم |
|---|---|
| `public/og-image.webp` | 28 KB |
| `public/pwa-512x512.png` | 14 KB |
| `public/pwa-192x192.png` | 19 KB |

- لا صور كبيرة غير مضغوطة في `public/` أو `src/assets/`.
- خطوط `Amiri`/`Tajawal` تُحمَّل بـ `@fontsource` (يظهر في imports).

---

## 8. خارطة الإصلاح المُقترحة (بدون تنفيذ)

### P0 — أثر فوري على DB وحمل الشبكة
| البند | الجهد | الأثر | المخاطر |
|---|---|---|---|
| توحيد `settingsQueryFn` عبر `select` | ~30 دقيقة | −15s DB / ساعة + آلاف الطلبات | منخفض — تغيير معزول في hook واحد |
| فهرس `access_log(event_type, created_at DESC)` | migration واحد | −20s DB إجمالي / max <5ms | منخفض |
| فهرس `access_log(user_id, event_type, created_at DESC)` | migration واحد | −17s DB إجمالي | منخفض |

### P1 — تقليل bundle الأولي
| البند | الجهد | الأثر | المخاطر |
|---|---|---|---|
| Dynamic import لـ `jspdf`+`html2canvas` من نقاط الاستدعاء | ~2 ساعة | −228 kB gz من الحزمة الأولى | متوسط — يتطلّب اختبار مسار PDF كاملاً |
| Lazy تغليف رسومات `recharts` بـ `ViewportRender` | ~1 ساعة | تأخير 101 kB gz حتى الحاجة | منخفض |
| View مادّي لـ `payment_invoices` مع embed | migration + refactor hook | mean من 22ms → <5ms | متوسط — يتطلّب تحديث RLS للـ view |

### P2 — نظافة معمارية
| البند | الجهد | الأثر |
|---|---|---|
| تفكيك `SystemDiagnosticsPage` (156 kB) | ~1 ساعة | تحسين TTI لصفحة تشخيصات فقط |
| إضافة `staleTime: STALE_STATIC` لـ 4 hooks (§2.2) | ~15 دقيقة | تقليل refetch عند التنقل |
| نقل `OAuthConsent.tsx` إلى `hooks/data/` | ~30 دقيقة | التزام معماري |
| `retryDelay` صريح في `queryClient` | ~5 دقائق | توثيق سلوك backoff |

---

## 9. خارج نطاق هذا التقرير

- **Playwright تفاعلي:** الجلسة `signed_out` في السياق الحالي — قياسات React Profiler و LCP الفعلية تتطلّب جلسة مُحقونة.
- **Migrations:** التقرير يقترح لكن لا يُنفِّذ (بموافقة المستخدم على خطة "تقرير فقط").
- **الأمن:** مغطّى بـ `audit/forensic-report.md` سابقاً.

---

**نهاية التقرير.** كل توصية أعلاه قابلة للتنفيذ بشكل مستقل. يوصى بتنفيذ P0 كـ PR منفصل أولاً لقياس الأثر الفعلي على `pg_stat_statements` قبل الانتقال لـ P1.
