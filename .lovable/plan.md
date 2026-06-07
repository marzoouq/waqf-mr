# خطة v2: نظام تشخيص شامل للناظر (Full-Stack Audit System)

نعم — هذه النسخة الموسّعة تغطي **التطبيق بالكامل** وتُبنى كـ **نظام تشخيصي متكامل** قابل للتوسعة (ليس صفحة واحدة فقط).

---

## البنية الكاملة للنظام

```text
src/lib/diagnostics/
├── engine/
│   ├── runner.ts            # محرك التنفيذ المتوازي/المتسلسل + cancel + retry
│   ├── registry.ts          # سجل الفحوصات (auto-discovery)
│   ├── reporter.ts          # توليد التقرير (JSON/PDF/CSV)
│   ├── scheduler.ts         # جدولة دورية (يومي/أسبوعي) عبر sessionStorage
│   └── types.ts             # CheckResult, Severity, Category, Suite
├── checks/
│   ├── infra/               # ‹‹ البنية التحتية ››
│   │   ├── db-connection.ts │ db-cloud-status.ts │ db-linter.ts
│   │   ├── edge-ping.ts (لكل 11 دالة) │ storage-bucket.ts
│   │   └── realtime-channel.ts │ rate-limits.ts
│   ├── security/            # ‹‹ الأمان ››
│   │   ├── rls-coverage.ts (42 جدول) │ user-roles-integrity.ts
│   │   ├── auth-session.ts │ webauthn-credentials.ts
│   │   ├── encrypted-fields.ts │ audit-log-immutability.ts
│   │   └── suppressed-emails.ts │ rate-limit-effectiveness.ts
│   ├── data-integrity/      # ‹‹ سلامة البيانات ››
│   │   ├── fiscal-year-active.ts │ fiscal-year-snapshots.ts
│   │   ├── contracts-orphans.ts │ contracts-allocations.ts
│   │   ├── invoices-vs-payments.ts │ invoice-chain-icv.ts
│   │   ├── distributions-sum.ts │ advance-limits.ts
│   │   ├── beneficiaries-shares-total.ts │ expense-budgets.ts
│   │   └── accrual-vs-stations.ts │ vat-centralization.ts
│   ├── business-logic/      # ‹‹ القواعد الشرعية/المحاسبية ››
│   │   ├── waqf-revenue-formula.ts │ corpus-carryforward.ts
│   │   ├── largest-remainder.ts │ negative-values-guard.ts
│   │   ├── revenue-recognition.ts │ collection-sync.ts
│   │   └── closed-year-immutability.ts │ multi-unit-pricing.ts
│   ├── routing/             # ‹‹ التوجيه والصفحات ››
│   │   ├── routes-manifest.ts (يفحص كل route في App.tsx)
│   │   ├── lazy-chunks-load.ts │ guarded-routes.ts
│   │   └── orphan-pages.ts (صفحات بدون route) │ broken-links.ts
│   ├── components/          # ‹‹ المكونات ››
│   │   ├── error-boundary-coverage.ts │ runtime-errors-log.ts
│   │   ├── translation-keys.ts (RTL/i18n) │ design-tokens-usage.ts
│   │   └── deprecated-imports.ts (yyyy/yyyy، supabase راو في pages)
│   ├── performance/         # ‹‹ الأداء ››
│   │   ├── chunks-size.ts (vendor-pdf, vendor-pdf-svg, app)
│   │   ├── web-vitals.ts (LCP/CLS/INP/TTFB) │ memory-heap.ts
│   │   ├── long-tasks.ts │ resource-budget.ts
│   │   └── network-waterfall.ts │ unused-css.ts
│   ├── pwa/                 # ‹‹ PWA و SW ››
│   │   ├── sw-registration-state.ts │ sw-refusal-reason.ts
│   │   ├── manifest-validity.ts │ icon-sizes.ts
│   │   └── cache-stale-detection.ts │ install-prompt.ts
│   ├── settings/            # ‹‹ الإعدادات ››
│   │   ├── app-settings-required-keys.ts │ public-stats-policy.ts
│   │   ├── beneficiary-widgets.ts │ tax-config.ts
│   │   └── zatca-certificates.ts │ email-templates.ts
│   ├── audit-mode/          # ‹‹ وضع التدقيق ››
│   │   ├── realtime-disabled.ts │ sw-blocked.ts
│   │   ├── query-client-elevated.ts │ pdf-chunks-deferred.ts
│   │   └── polling-stopped.ts (app_settings, get_public_stats)
│   └── notifications/       # ‹‹ التنبيهات والبريد ››
│       ├── email-send-log-health.ts │ unsubscribe-tokens.ts
│       └── notifications-queue.ts │ support-tickets-routing.ts
└── fixers/                  # ‹‹ إصلاحات تلقائية اختيارية ››
    ├── clear-stale-cache.ts │ unregister-sw.ts
    └── reset-session-storage.ts │ refetch-app-settings.ts
```

**إجمالي الفحوصات المخطّطة: ~85 فحص** موزّعة على 10 فئات (Suites).

---

## 1) شاشة تشخيص فورية في وضع التدقيق (`?audit=1`)

**`src/components/diagnostics/AuditModeOverlay.tsx`** — Overlay قابل للطي (وليس مجرد banner):
- بطاقات حية: Realtime / SW / QueryClient / PDF chunks / Polling
- يُحدّث كل ثانية عبر `requestAnimationFrame`
- زر "افتح مركز التشخيص الكامل" → ينقل لـ `/admin/diagnostics`
- يظهر فقط عند `isAuditMode()` ولا يلوّث الواجهة العادية

**`src/lib/diagnostics/collectAuditSignals.ts`** — pure function تجمع الإشارات
**`src/lib/pwaBootstrap.ts`** — إضافة `getSwRefusalReason(): string` exported

---

## 2) مركز التشخيص الشامل — `/admin/diagnostics`

### الصفحات الفرعية (Tabs/Sub-routes)
1. **نظرة عامة** — Health Score (0-100) + رسم بياني دائري لكل suite
2. **الفحص الحي** — العداد التفاعلي (current/total + شريط تقدم + سجل scroll)
3. **النتائج التفصيلية** — جدول كل النتائج مع فلاتر (suite, severity, status, نص حر)
4. **السجل التاريخي** — آخر 20 تشغيل محفوظة في `localStorage` للمقارنة
5. **خريطة التطبيق** — شجرة كل الصفحات/المجلدات مع حالة كل واحدة (✓/⚠/✗)
6. **الإصلاحات** — الإجراءات اليدوية المقترحة + أزرار fixer للإصلاحات الآمنة
7. **التقارير** — تصدير JSON/CSV/PDF + إرسال بريد للناظر

### العداد الحقيقي
```ts
runAudit({
  suites: ['infra', 'security', ...],   // اختيار اختياري
  parallelism: 4,                         // فحوصات متوازية
  onProgress: ({ done, total, current, eta, partialResults }) => {...},
  signal: abortController.signal,         // قابل للإلغاء
})
```
- يعرض **العدد الفعلي / الإجمالي**، الفحص الحالي بالاسم، الوقت المنقضي، الوقت المتوقع
- لكل فحص: ms، severity، رسالة عربية، الإصلاح المقترح، رابط للملف/الكود ذي الصلة
- يحفظ النتيجة في `localStorage` (مع تاريخ) للمقارنة الزمنية

### واجهة الفحص (UI)
- بطاقات Suite بألوان semantic (`--success`, `--warning`, `--destructive`)
- جدول `data-table` مع توسيع صف لعرض التفاصيل التقنية
- Health Score badge في الـ header
- زر "إعادة فحص الفئة المحددة فقط"
- زر "تشغيل في الخلفية" (Web Worker اختياري لمستقبلًا)

---

## 3) مولّد خريطة التطبيق التلقائي

**`src/lib/diagnostics/appMap/buildAppMap.ts`**
- يُحلّل `App.tsx` (AST بسيط أو import.meta.glob) ليُنتج شجرة:
  ```
  / (LandingPage) ✓
  ├── /admin/dashboard ✓
  ├── /admin/contracts ⚠ (1 تحذير)
  ├── /admin/diagnostics ✓
  └── ...
  ```
- يضمن أن أي route مكتشف **مغطّى بفحص routing** تلقائياً
- يفحص: lazy import يعمل، الصفحة تُرندر بدون خطأ، الـ guard صحيح

---

## 4) جامع أخطاء التشغيل (Runtime Error Collector)

**`src/lib/diagnostics/runtimeCollector.ts`**
- يُسجَّل في `main.tsx` على `window.error` و `unhandledrejection`
- يخزن آخر 100 خطأ في `sessionStorage` مع stack/route/timestamp
- يُستهلَك عبر فحص `components/runtime-errors-log.ts`

---

## 5) دليل الفحص الكامل — `docs/diagnostics/`

```
docs/diagnostics/
├── README.md                       # نظرة عامة على النظام
├── devtools-lighthouse-guide.md    # دليل DevTools/Lighthouse الكامل
├── audit-mode-flags.md             # كل أعلام ?audit / ?sw=off / ?debug=*
├── check-catalog.md                # كاتالوج كل الفحوصات الـ85
├── adding-new-check.md             # دليل إضافة فحص جديد للمطوّر
├── troubleshooting-playbook.md     # سيناريوهات شائعة + الحل
└── ci-integration.md               # تشغيل ALL_CHECKS في CI (مستقبلًا)
```

محتوى `devtools-lighthouse-guide.md` العربي الكامل:
- ما قبل الفحص: Hard Reload، Clear Site Data، Incognito، تعطيل الإضافات
- استخدام `?audit=1` على preview/published
- Lighthouse: Navigation/Snapshot/Timespan، Mobile vs Desktop، throttling
- DevTools Sources: تجنّب `vendor-pdf*` (يحتوي base64 fonts ≈ ميجابايت)
- Performance/Profiler: تسجيل مع `?audit=1`
- Coverage و Memory و Network filters
- Application > Service Workers + Storage
- متى تستخدم `/admin/diagnostics` بدلاً من DevTools

---

## 6) أعلام التحكم (URL Flags)

| العلم | الأثر |
|------|------|
| `?audit=1` | يعطل realtime/SW/refetch، يرفع staleTime |
| `?sw=off` | يلغي تسجيل SW (موجود مسبقًا) |
| `?diag=1` | يفتح Overlay التشخيص حتى لمستخدم عادي (admin only فعلياً) |
| `?diag-suite=security` | يشغّل فقط Suite معيّن عند الدخول لـ /admin/diagnostics |

---

## 7) الاختبارات

- `engine/runner.test.ts` — التوازي، الإلغاء، progress، retry
- `engine/registry.test.ts` — auto-discovery، عدم تكرار IDs
- `engine/reporter.test.ts` — JSON/CSV/PDF
- `appMap/buildAppMap.test.ts` — تحليل routes
- `runtimeCollector.test.ts` — التقاط الأخطاء
- `AuditModeOverlay.test.tsx` — لا يُعرض خارج audit mode
- **10+ فحوصات نموذجية mocked** (واحد من كل suite)

---

## 8) القيود التقنية

- ✅ **بدون migrations** — كل الفحوصات SELECT-only عبر `supabase` client
- ✅ **بدون edge functions جديدة** — ping يستخدم الموجودة
- ✅ **لا تعديل ملفات محمية** (`client.ts`, `types.ts`, `config.toml`, `.env`)
- ✅ Page Hook Pattern: `AdminDiagnostics.tsx` presentational فقط (≤200 سطر)
- ✅ المنطق في `useAdminDiagnosticsPage.ts` (≤180 سطر)
- ✅ كل النصوص عربية RTL، Intl ar-SA للأرقام والتواريخ
- ✅ ألوان عبر `hsl(var(--*))` حصراً
- ✅ `logger` بدلاً من `console`
- ✅ محمي بـ `<ProtectedRoute requiredRole="admin">` — الناظر فقط

---

## 9) خارطة التغييرات

**ملفات جديدة (~50 ملف):**
- محرك: 5 ملفات تحت `engine/`
- فحوصات: ~50 ملف check تحت `checks/` (مقسّم 10 suites)
- مُصلحات: 4 ملفات تحت `fixers/`
- خريطة التطبيق: 2 ملف تحت `appMap/`
- UI: `AdminDiagnostics.tsx` + 7 sub-components (Overview, LiveRun, Results, History, Map, Fixes, Reports)
- Hook: `useAdminDiagnosticsPage.ts` + 3 sub-hooks
- Overlay: `AuditModeOverlay.tsx`
- Collector: `runtimeCollector.ts`
- وثائق: 7 ملفات تحت `docs/diagnostics/`
- اختبارات: ~15 ملف

**ملفات تُعدَّل (3 فقط):**
- `App.tsx` — route + overlay + collector init
- `src/lib/pwaBootstrap.ts` — export `getSwRefusalReason()`
- sidebar الإدارة — رابط "تشخيص النظام"

---

## 10) التنفيذ المرحلي (داخل نفس الـ build mode)

1. **المرحلة 1 — الأساس**: engine + types + registry + runner + reporter + UI shell
2. **المرحلة 2 — Audit Mode UX**: Overlay + collectAuditSignals + getSwRefusalReason + collector
3. **المرحلة 3 — الفحوصات الحرجة (30)**: infra + security + data-integrity + audit-mode
4. **المرحلة 4 — بقية الفحوصات (55)**: business-logic + routing + components + performance + pwa + settings + notifications
5. **المرحلة 5 — appMap + History + Fixers + Reports**
6. **المرحلة 6 — الوثائق السبعة + الاختبارات**
7. **التحقق الخماسي قبل الإنهاء**: tsc → vitest → ESLint → build → manual smoke على `/admin/diagnostics`

---

**الإجابة المختصرة:**
- نعم، يغطي **التطبيق بالكامل** (DB + RLS + Edge + Routes + Components + Business Logic + PWA + Performance + Settings + Notifications).
- نعم، يُبنى كـ **نظام شامل قابل للتوسعة** (محرك + سجل فحوصات + مُصلحات + تقارير + سجل تاريخي + خريطة) — وليس صفحة جامدة.
