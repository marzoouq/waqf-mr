## فحص جنائي: تحقق من الخطة الأصلية ضد الوضع الراهن

أعدتُ فحص كل افتراض في الخطة السابقة بقراءة الملفات الفعلية والـ RPC وحزم العميل. النتيجة: **3 من 8 إصلاحات مقترحة كانت قد طُبِّقت فعلاً أو غير قابلة للتنفيذ**. أدناه الخطة المُنقَّحة فقط بإصلاحات حقيقية بدليل.

---

### A) ما تأكَّد (يُنفَّذ)

| # | الادعاء الأصلي | التحقق من المصدر | الحالة |
|---|----------------|------------------|--------|
| 1 | `invoke:dashboard-summary` ~2.3s | console + `dashboard-summary/index.ts` يستدعي `get_dashboard_full_summary` (374 سطر، 15+ SELECT) + `authenticate()` شبكي | ✅ مؤكَّد |
| 2 | RPC ينفّذ استعلامات ديناميكية حتى للسنوات المغلقة | `SELECT SUM(amount) FROM income/expenses WHERE fiscal_year_id = v_fy_id` يُنفَّذ **قبل** `IF v_is_closed` (سطر 94–98 من RPC) | ✅ مؤكَّد — هدر |
| 3 | `classifyError` يعيد المحاولة على CORS في DEV | `getErrorStatus.ts:35-37`: `TypeError fetch` → `'network'` → `isRetryableCategory` يرجع `true` → RQ يعيد مرتين | ✅ مؤكَّد |
| 4 | `autoRun` يُشغّل 76 فحصاً فور تركيب صفحة التشخيص | `useSystemDiagnostics.ts:94-106` يستدعي `runAllDiagnostics` عبر `requestIdleCallback` | ✅ مؤكَّد |
| 5 | `useDashboardSummary` بلا `placeholderData` | `useDashboardSummary.ts:24-44` — لا `placeholderData` ولا `keepPreviousData` → skeleton يظهر عند كل تبديل سنة | ✅ مؤكَّد |
| 6 | تحذير «Perf» عند 2000ms يُسجَّل بلا قيمة عملية | `queryMonitor.ts:WARN_QUERY_THRESHOLD_MS = 2000` يلتقط cold-start كأنه مشكلة | ✅ يصحّ رفعه |

### B) ما سقط بعد الفحص

| # | الادعاء الأصلي | الواقع | القرار |
|---|----------------|--------|--------|
| B1 | «AdminDashboard يستورد 14 ويدجت eager» | الملف يستخدم `lazy()` لـ Charts/Heatmap/PendingActions/Performance، و`DashboardLazySection` للبقية تحت الطية. الـ eager فعلاً فوق الطية فقط (Header, Alerts, StatsGrid, KpiPanel, FiscalYearWidget, QuickActions) — صحيح معمارياً | ❌ يُحذَف |
| B2 | «`recordPayloadSize` يُبطّئ DEV» | `payloadMonitor.ts:21` يرجع مبكراً إذا `!DEV` أو `bytes < 500KB` — لا أثر فعلي | ❌ يُحذَف |
| B3 | «تحذير `Deprecated API` من web-vitals يمكن إصلاحه بـ `durationThreshold`» | فحص bundle `web-vitals` v5.2.0: السطر `f("event", M, {durationThreshold: 0})` للحساب الداخلي لـ `interactionCount`، التحذير من المتصفح لمراقبة `event` entry type بـ `durationThreshold: 0` — **داخل المكتبة، لا يمكن إصلاحه دون forking** | ❌ لا fix؛ نُسكته فقط في `runtimeCollector` |

---

### C) الخطة المُنقَّحة (4 إصلاحات + سكتم تحذير)

#### F1 — RPC `get_dashboard_full_summary`: تخطّي الحسابات الديناميكية للسنوات المغلقة
- **الموقع:** ترحيل DB جديد يعيد تعريف الدالة.
- **التغيير:** نقل `SELECT SUM(income)`, `SELECT SUM(expenses)`, وأي استعلامات قابلة للاشتقاق من `accounts` snapshot إلى داخل `IF NOT v_is_closed THEN ... END IF`. للسنوات المغلقة نقرأ من `v_account.total_income`, `v_account.total_expenses` مباشرة (موجودة فعلاً).
- **القياس المتوقع:** السنوات المغلقة تنفّذ ~5 SELECT بدل ~15 → زمن استجابة أقل بـ 30–50%.
- **مخاطرة:** إن كانت snapshots غير مكتملة لسنة مغلقة قديمة → نضمن fallback (`COALESCE(v_account.total_income, (SELECT SUM ...))`) لمنع كسر بيانات أرشيفية.

#### F2 — `useDashboardSummary`: `placeholderData` لتبديل سلس للسنة
- **الموقع:** `src/hooks/data/financial/dashboard/useDashboardSummary.ts`.
- **التغيير:** إضافة `placeholderData: (prev) => prev` للـ `useQuery`. نفس الشيء لـ `useDashboardSecondary` (heatmap, recent contracts).
- **الأثر:** تبديل السنة من القائمة المنسدلة يُبقي البيانات الحالية ظاهرة بينما يجلب الجديد بدل skeleton كامل.

#### F3 — `classifyError`: كسر retry loop على CORS في DEV
- **الموقع:** `src/utils/error/getErrorStatus.ts` (دالة `classifyError`).
- **التغيير:** عند `import.meta.env.DEV && e.name === 'TypeError' && /CORS|preflight|Access-Control/i.test(message)` → فئة `'validation'` (غير قابلة لإعادة المحاولة).
- **الأثر:** DEV فقط — يحذف 3 محاولات × ~250ms = ~750ms + 3 رسائل CORS من الكونسول. لا يمسّ الإنتاج.

#### F4 — صفحة التشخيص: `autoRun` خفيف فقط
- **الموقع:** `src/lib/diagnostics/checks.ts` + `src/hooks/page/admin/management/useSystemDiagnostics.ts`.
- **التغيير:**
  - إضافة قائمة `LIGHT_AUTO_RUN_CATEGORIES` (مثلاً: `'بيئة التشغيل'`, `'التخزين'`, `'التوجيه'`, `'الاتفاقيات'`) — ~20–25 فحصاً بلا استدعاءات DB ثقيلة.
  - الـ `autoRun` يستدعي `runByIds(lightIds)` بدل `runAllDiagnostics()`.
  - زر «تشغيل كل الفحوصات» (موجود) يبقى كما هو لـ on-demand.
- **الأثر:** LCP على `/dashboard/diagnostics` يهبط من ~27s إلى ~1–2s. باقي البطاقات تظهر بحالة «لم تُشغَّل بعد» مع زر تشغيل بطاقي.

#### F5 — `queryMonitor` و`runtimeCollector`: تقليل الضوضاء
- **الموقع:** `src/lib/monitoring/queryMonitor.ts` + `src/lib/diagnostics/runtimeCollector.ts`.
- **التغيير:**
  - `WARN_QUERY_THRESHOLD_MS: 2000 → 3000` (تجاهل قمم cold-start المنعزلة).
  - في `runtimeCollector`، تصفية رسائل `/Deprecated API for given entry type/i` (مصدرها web-vitals داخلياً) قبل تخزينها — تبقى مرئية في الكونسول لكن لا تُلوّث «أخطاء التشغيل» في التشخيص.

---

### D) ترتيب التنفيذ والتحقق

```text
F2  → تطبيق فوري + إعادة تحميل /dashboard، التحقق أن تبديل السنة لا يُظهر skeleton
F3  → إعادة تحميل /dashboard في DEV، التحقق من اختفاء تكرار CORS errors
F4  → فتح /dashboard/diagnostics، قياس LCP الجديد عبر Playwright
F1  → ترحيل DB، اختبار على سنة مغلقة فعلية + سنة نشطة (تطابق المخرجات)
F5  → التحقق من السجلات أن «Perf» لا يظهر على < 3s، وأن «Deprecated API» اختفى من التشخيص
```

### E) ما لن أعمله (مُبرَّر)

- ❌ تعديل web-vitals API — التحذير من داخل المكتبة، إصلاحه يتطلب forking.
- ❌ تحويل ويدجت AdminDashboard إلى lazy — مطبَّق فعلاً بشكل صحيح.
- ❌ ضبط `recordPayloadSize` — مُحكَم فعلاً (DEV + 500KB+).
- ❌ تغيير `staleTime` العام — مناسب لطبيعة البيانات المالية (60s).
- ❌ SSR/SSG — خارج النطاق المعماري.

### F) معايير القبول

| الإصلاح | المقياس | الهدف |
|---------|--------|------|
| F1 | `EXPLAIN ANALYZE EXECUTE get_dashboard_full_summary(closed_fy_id)` | < 200ms |
| F2 | تبديل السنة من dropdown | لا skeleton مرئي |
| F3 | `/dashboard` في DEV | 0 رسائل CORS متكررة |
| F4 | LCP على `/dashboard/diagnostics` (Playwright) | < 2500ms |
| F5 | كونسول `/dashboard` خلال 60s | 0 تحذيرات «Perf» زائفة، 0 «Deprecated API» في التشخيص |

هل أبدأ بتنفيذ F1–F5 بالترتيب أعلاه، أم تريد تعديل النطاق؟