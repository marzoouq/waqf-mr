# خطة الفحص الجنائي الشامل — تغطية 100% ملف بملف

**التعهد**: كل ملف في المستودع (~1,437 ملف مصدري + إعدادات + توثيق + CI + migrations) سيمر عبر أحد الفاحصين الآليين + مراجعة يدوية للطبقات الحرجة. لن يُستثنى أي ملف. الفحص **قراءة فقط**.

---

## جدول التغطية الكامل (كل مجلد → المرحلة المسؤولة)

| المسار | عدد تقريبي | المرحلة | نوع الفحص |
|---|---:|---|---|
| **جذر المستودع** | | | |
| `package.json`, `bun.lockb`, `.env.example`, `LICENSE`, `AGENTS.md`, `components.json` | 6 | M1 | drift + secrets |
| `tsconfig.json`, `tsconfig.base.json`, `tsconfig.app.json`, `tsconfig.node.json` | 4 | M1 | paths, strict, includes |
| `vite.config.ts`, `vitest.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `playwright.config.ts`, `eslint.config.js` | 6 | M1 | إعدادات البناء والفحص |
| **CI / Git hooks** | | | |
| `.github/workflows/*.yml` (ci, test, security-audit, health-check, changelog) | 5 | M1 | بوابات، أسرار، matrix |
| `.github/CODEOWNERS`, `dependabot.yml`, `ISSUE_TEMPLATE/*`, `pull_request_template.md` | 5 | M1 | حوكمة |
| `.husky/pre-commit`, `.husky/pre-push` | 2 | M1 | pre-push gates |
| **Scripts** | | | |
| `scripts/*.mjs` + `scripts/build-chunks.ts` (audit-all, audit-structure, audit-hooks-layout, ui-permissions, page-controls, build-report, deletion-gate, dependency-drift, security-gates, count-edge-functions, build-permissions-matrix, install-git-hooks) | 12 | M1 | صحة السكربتات |
| **Public / PWA** | | | |
| `public/manifest.webmanifest`, `_headers`, `robots.txt`, `sitemap.xml`, `llms.txt`, أيقونات | ~10 | M1 | CSP, PWA, SEO |
| **Supabase Backend** | | | |
| `supabase/config.toml` | 1 | M2 | (قراءة فقط — محمي) |
| `supabase/migrations/*.sql` | ~ | M2 | RLS, GRANT, search_path, triggers |
| `supabase/functions/_shared/*` | ~10 | M2 | auth, CORS, maskEmail, ZATCA XML |
| `supabase/functions/<11 function>/**` | ~40 | M2 | getUser, Zod, cold-start, secrets |
| **Frontend Entry & Router** | | | |
| `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`, `src/index.css` | 4 | M3 | bootstrap order |
| `src/app/**` (bootstrap, providers, router, root-layout) | 8 | M3 | side-effect isolation |
| `src/routes/**` (adminRoutes, beneficiaryRoutes, waqifRoutes, publicRoutes, ProtectedRouteHelper, RouteErrorBoundary) | 8 | M3 | lazy loading, guards |
| **Contexts** | | | |
| `src/contexts/**` (AuthContext, FiscalYearContext, ContractsContext) | 5 | M3 | تسريبات state, re-renders |
| **Hooks — تغطية كل ملف** | | | |
| `src/hooks/auth/**` (session, role, biometric, flows) | 25 | M3 | صلاحيات، WebAuthn |
| `src/hooks/data/**` (financial, settings, invoices, contracts, archive, support…) | 133 | M3 | supabase مباشر، toast محظور |
| `src/hooks/domain/**` (financial calculations) | 21 | M3 | نقاء، لا supabase |
| `src/hooks/page/admin/**`, `page/beneficiary/**`, `page/auth/**` | 123 | M3 | Page Hook Pattern |
| `src/hooks/application/**` (cross-role controllers) | 16 | M3 | تعدد الأدوار |
| `src/hooks/ui/**` (idle, print, pwa, upload, sounds, sort, debounce…) | 20 | M3 | DOM APIs، تسريبات listeners |
| **Lib** | | | |
| `src/lib/services/**`, `lib/monitoring/**`, `lib/diagnostics/**`, `lib/notify/**`, `lib/realtime/**`, `lib/theme/**`, `queryClient.ts`, `errorReporter.ts`, `logger.ts`, `initQueryMonitoring.ts` | 136 | M3 | حدود lib vs utils |
| **Utils (يجب أن تكون pure)** | | | |
| `src/utils/**` (accounts, auth, chart, contracts, date, error, export, financial, fiscalYear, fonts, format, image, invoices, pdf, properties, reports, ui, validation, zatca) | 152 | M3 | ممنوع supabase/toast/hooks |
| **Types & Constants** | | | |
| `src/types/**`, `src/constants/**` | 56 | M3 | تكرار، تعارض، جمود |
| **Pages — كل صفحة تُفحص** | | | |
| `src/pages/*.tsx` (Auth, Index, InstallApp, NotFound, OAuthConsent, PrivacyPolicy, ResetPassword, TermsOfUse, Unauthorized) | 9 | M4 | logic-less |
| `src/pages/dashboard/**` (Admin+Accountant: Properties, Contracts, Income, Expenses, Invoices, Distribution, Accounts, Beneficiaries, ChartOfAccounts, AuditLog, AuditReportFinal, Archive, Messages, SupportDashboard, SystemDiagnostics, UserManagement, ZatcaManagement, HistoricalComparison, AnnualReport…) | ~30 | M4 | Container/Presentational |
| `src/pages/beneficiary/**` (Dashboard, Accounts, Archive, Contracts, Disclosure, Expenses, FinancialReports, Invoices, Messages, Notifications, Settings, Support, CarryforwardHistory, AnnualReport) | ~15 | M4 | RLS reflection |
| `src/pages/waqif/**` (WaqifDashboard) | 1 | M4 | read-only |
| **Components — كل مكون** | | | |
| `src/components/**` (ui/, layout/, financial/, admin/, beneficiary/, auth/, dialogs/, print/, diagnostics/, …) | 486 | M4 | ألوان hex، a11y، حجم، RTL |
| **Tests** | | | |
| `src/**/*.test.ts(x)`, `src/test/**` (permissionsResilience, authFlowsIntegration, incomeExpensesCrudReflection, edgeFunctionAuth…) | 58 | M6 | تغطية، mocks كاملة |
| `tests/e2e/**` (Playwright: expenses-documentation-parity, helpers) | ~5 | M6 | تشغيل حقيقي |
| **Docs & Audit trail** | | | |
| `docs/**` (api, auth, diagnostics×6, security×3, notifications, pwa, migrations-policy) | ~15 | M6 | تحديث الوثائق مع الكود |
| `audit/**` السابق (report.html, csv, md) | ~20 | M6 | حداثة، دقة |
| `.lovable/**` (plan.md, audit-2026-05-27.md, mcp/manifest.json) | 3 | M6 | حالة داخلية |

**المجموع**: كل ملف قابل للتتبع في Git ضمن مرحلة واحدة على الأقل. `src/integrations/supabase/{client,types}.ts` تُفحص للقراءة فقط (محمية).

---

## المراحل الست — مدخلات ومخرجات صريحة

### M1 — البنية التحتية (Infra)
- **يشمل**: جذر، `tsconfig*`, `vite.config`, `tailwind`, `eslint`, `vitest`, `playwright`, `postcss`, CI (5 workflows)، husky (2)، scripts (12)، public (~10)، dependabot، CODEOWNERS.
- **الفحوصات**: `depcheck`, `knip`, version drift (`scripts/dependency-drift-check.mjs`)، secret scan (`rg` لكل *.env / mfg patterns)، سلامة workflows (actionlint إن توفر)، CSP في `_headers`، manifest scope.
- **الإخراج**: `audit/phase-1-infra.md` + جدول ملف/سطر/شدة.

### M2 — Supabase Backend
- **يشمل**: `config.toml`, كل ملفات `supabase/migrations/`, كل `supabase/functions/**` (11 دالة + `_shared`), `deno.json`.
- **الفحوصات**: مطابقة كل `CREATE TABLE` بـ `GRANT` + `ENABLE RLS` + `POLICY`؛ كل دالة PL/pgSQL لها `SET search_path`؛ كل Edge Function تستخدم `getUser` وZod؛ CORS موحّد؛ لا أسرار مطبوعة؛ ICV chain سليم؛ email templates بدون تسريب.
- **أدوات**: `supabase--linter`, مسح يدوي migration بmigration.
- **الإخراج**: `audit/phase-2-backend.md` + RLS matrix (جدول × دور × عملية).

### M3 — طبقة المنطق (Hooks + Lib + Utils + Types)
- **يشمل**: 133 data + 21 domain + 123 page + 16 application + 25 auth + 20 ui = **338 hook**؛ 136 lib؛ 152 utils؛ 56 types/constants؛ contexts (5)؛ router/routes/app (21).
- **الفحوصات لكل ملف**:
  - اتجاه الاعتماد (لا page→data مباشر عبر supabase، لا component→data، لا utils→hooks/supabase/toast).
  - حجم > 200 سطر (18 ملف حالياً).
  - `any` غير مبرّر، `console.*` مباشر، `crypto.randomUUID` بدون polyfill، `useEffect` مع setState غير محمي.
  - Barrel imports دورية.
  - `staleTime` مفقود في queries.
- **أدوات**: `scripts/audit-hooks-layout.mjs`, `scripts/audit-conventions-deep.mjs`, `tsgo`, `eslint`.
- **الإخراج**: `audit/phase-3-logic.md` + قائمة كل ملف بحالته (نظيف / مخالفات).

### M4 — طبقة العرض (Pages + Components + Layouts)
- **يشمل**: **9 pages جذر + ~30 admin + ~15 beneficiary + 1 waqif + 486 component** = **~541 ملف**.
- **الفحوصات لكل ملف**:
  - Container vs Presentational (Hybrid ممنوع، > 180 سطر ممنوع).
  - استيراد supabase أو data hooks مباشرة (ممنوع).
  - ألوان hex/`text-white`/`bg-black` ممنوعة (متغيرات CSS فقط).
  - a11y: aria-label، labels على inputs، headings hierarchy، alt للصور.
  - RTL: لا `left-`/`right-` بدون `rtl:` مقابلة.
  - `useEffect` مع setState داخل نفس المصفوفة.
  - Props ≥ 5 مجمّعة، memo فقط على table rows.
- **أدوات**: `scripts/audit-page-controls.mjs`, `scripts/audit-ui-permissions.mjs`, `eslint jsx-a11y`.
- **الإخراج**: `audit/phase-4-ui.md` + مصفوفة صلاحيات UI (زر × دور × handler موجود؟).

### M5 — الأمان والخصوصية
- **يشمل**: كل RLS، كل Edge Function، auth flows، PII encryption، storage buckets، CSP، rate limits، WebAuthn، OAuth consent، signup guard.
- **الفحوصات**:
  - RLS matrix شاملة (كل جدول × كل دور × SELECT/INSERT/UPDATE/DELETE).
  - Storage: buckets policies + broad-read.
  - `pgcrypto` استخدام صحيح على أرقام الهوية/الحسابات البنكية.
  - Secret scan شامل عبر كامل history الملفات المتتبعة.
  - CSP في `public/_headers` + `docs/security/csp-policy.md`.
  - Headers أمنية (HSTS, X-Frame, Referrer-Policy).
  - `verify_jwt = false` مبرّر ومطابق للتوثيق.
- **أدوات**: `security--run_security_scan`, `supabase--linter`, `scripts/security-gates.mjs`, `rg` لـ secrets.
- **الإخراج**: `audit/phase-5-security.md` + تحديث `@security-memory` إن لزم.

### M6 — الأداء والاختبارات والوثائق
- **يشمل**: 58 اختبار وحدة + ~5 E2E + docs (~15) + audit tracts + PWA + bundle.
- **الفحوصات**:
  - `tsgo` (0 errors)، `eslint` (0 errors, warnings مصنّفة).
  - `vitest run` (كل الـ 2190+ اختبار)، تغطية بـ `--coverage`.
  - `playwright test` (مطلوب dev server).
  - `bun run build` — تحليل حجم كل chunk، تحقق `manualChunks` فعال.
  - Lazy loading gaps (كل route lazy؟).
  - PWA: `registerPwa.ts` + manifest + service worker + runtime cache.
  - نسبة الملفات بدون test (خارطة الفجوات).
  - تحديث `docs/` مع الكود، إزالة audit قديم متضارب.
- **الإخراج**: `audit/phase-6-quality.md` + heatmap تغطية.

---

## التقرير النهائي الموحّد
`audit/FORENSIC-2026-07-FINAL.md`:
- **الملخص التنفيذي**: عدد ملفات مفحوصة / نظيفة / تحتاج عمل، توزيع الشدة.
- **الجدول الرئيسي**: `#, الملف, السطر, الشدة (Critical/High/Medium/Low/Info), الفئة, الوصف, الإصلاح, الجهد (S/M/L)`.
- **Heatmap** لكل مجلد رئيسي.
- **قائمة "ملفات نظيفة 100%"** vs **"ملفات تحتاج إصلاح"** (هدف: تحويل الثانية إلى صفر).
- **خارطة طريق** تدريجية (P0 → P3) للوصول إلى **0 مشكلة**.

---

## ضمانات عدم الاستثناء
1. جرد أولي: `find . -type f -not -path './node_modules/*' -not -path './.git/*' -not -path './dist/*'` يُنتج قائمة مرجعية.
2. كل مرحلة تُخرج CSV بأسماء الملفات المفحوصة.
3. تقرير نهائي يقارن المجموع بالجرد الأولي — أي فارق يُعالج قبل الإغلاق.

---

## القيود الصارمة
- لا تعديل ملف واحد في هذه الجولة.
- لا تعديل schema / RLS / config.toml / client.ts / types.ts / .env.
- لا حذف — رصد فقط.
- بعد كل مرحلة: ملخص + انتظار إشارتك (أو "نفّذ الست دفعة واحدة" لتشغيل متتالي).

## سؤال أخير قبل التنفيذ
- **(أ)** تشغيل المراحل الست تباعاً في جلسة واحدة → تقرير نهائي موحّد.
- **(ب)** مرحلة تلو الأخرى مع مراجعتك بعد كل تقرير.
- **(ج)** الأولوية للأمان أولاً (M2+M5) ثم الباقي.
