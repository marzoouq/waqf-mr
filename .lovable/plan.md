# خطة الفحص الجنائي الشاملة v2 — 7 موجات + ملاحق

نسخة موسّعة بعد مراجعة الفجوات. أُضيفت محاور كانت ناقصة: التخزين، Realtime، الإشعارات بكل قنواتها، PWA/SW، PDF/الخطوط، Cron/Webhooks، Idempotency، السلامة المرجعية والمعاملات، الامتثال (ZATCA + PDPL سعودي)، التوافق المتصفحي، الطباعة، Dark mode، WCAG، Observability، Secrets rotation، Backups، OWASP Top 10، Race conditions على التدفقات المالية.

---

## مبادئ التشغيل

- **قراءة فقط** — لا تعديل كود/migrations/secrets في كل الموجات السبع.
- **مخرج كل موجة**: ملف Markdown + ملاحق + ملخص شات بأهم 10 نتائج.
- **خطورة موحّدة**: 🔴 Critical / 🟠 High / 🟡 Medium / 🔵 Low / ⚪ Info.
- **معرّف فريد**: `W{موجة}-{تسلسل}` (ثابت عبر الموجات).
- **Cross-Wave Reconciliation**: كل نتيجة في موجة لاحقة تُربط بـ ID موجة سابقة إن وُجد سبب جذري مشترك.
- **Coverage tracking**: كل ملف يُمسح يُسجَّل في `coverage-ledger.csv` لمنع التكرار/الإغفال.
- **منهجية**: subagents بالتوازي داخل الموجة + sequential بين الموجات.

---

## الموجة 1 — البنية الجذرية والإقلاع والـ DX (Foundation, Bootstrap, DX)

### النطاق
- `src/main.tsx`, `src/App.tsx`
- `src/app/**` (bootstrap/initMonitoring, mountReact, preconnectBackend, registerPwa, removeSplash, providers, router, root-layout)
- `index.html` (meta, viewport, OG, JSON-LD, lang, dir, splash, preconnect)
- `vite.config.ts`, `tsconfig*.json`, `tailwind.config.ts`, `postcss.config.js`, `components.json`
- `package.json`, `bun.lock` (deps، peer deps، resolutions، scripts)
- `public/**` (robots, sitemap, manifest.webmanifest, _headers, llms.txt, icons, favicons)
- `src/integrations/supabase/**` (قراءة محمي — التحقق من client init فقط)
- `.github/workflows/**` (ci, test, health-check, auto-version, changelog) + branch protection
- `.github/CODEOWNERS`, dependabot, PR/Issue templates
- `.husky/**` (pre-commit, pre-push) + `scripts/**` (audit-all, audit-hooks-layout, audit-structure, build-permissions-matrix, deletion-gate, security-gates, install-git-hooks)
- `.env.example`, `.env` (المتغيرات فقط بدون قيم)
- `vitest.config.ts`, `tsconfig.node.json`
- `AGENTS.md`, `LICENSE`, `.lovable/plan.md`, `.lovable/audit-2026-05-27.md`

### محاور الفحص
- صحة الإعدادات (Vite chunks، Tailwind purge، PostCSS plugins)
- إصدارات: React 19، Vite 5، TS 5.8.3، Node 22 LTS، لا preview/alpha
- PWA: manifest صحيح، SW registration، update flow، offline strategy
- SEO: meta length، canonical، sitemap حديث، robots متّسق، JSON-LD
- CSP/Security headers في `_headers`
- preconnect/dns-prefetch للـ backend
- Error boundaries جذرية + monitoring init
- CI: لكل push/PR ماذا يُشغَّل؟ branch protection rules
- Husky hooks: ماذا يمنع وماذا يمر؟
- `scripts/security-gates.mjs`, `deletion-gate.mjs` تغطية فعلية
- Splash screen + removeSplash timing
- DX: lint rules، formatter، editor configs

### المخرج
`01-foundation.md` + `coverage-ledger.csv` (initial)

---

## الموجة 2 — التوجيه والمصادقة والصلاحيات (Routing, Auth, Permissions, RBAC)

### النطاق
- `src/routes/**` (adminRoutes, beneficiaryRoutes, waqifRoutes, publicRoutes, ProtectedRouteHelper, RouteErrorBoundary, withRouteErrorBoundary)
- `src/contexts/AuthContext.tsx`, `FiscalYearContext.tsx`, `ContractsContext.tsx` + tests
- `src/hooks/auth/**` (session, role, biometric/{useWebAuthn,useWebAuthnAuth,useWebAuthnManage,useWebAuthnRegister}, flows)
- `src/hooks/application/usePermissionCheck.ts` + `RequirePermission`
- `src/constants/{roles,routeRoles,navigation,navigationIcons,rolePermissions,sections,bottomNavLinks,quickActions}.ts`
- `audit/ui-permissions-matrix.csv` + `ui-permissions-audit.md`
- `docs/auth/role-source.md`
- `supabase/functions/webauthn/**` (مرتبطة بالـ flow)
- `supabase/functions/guard-signup/**`
- `supabase/functions/auth-email-hook/**`

### محاور الفحص
- **مصفوفة 4 أدوار × كل المسارات (~60 مسار)**: client guard + server RLS + permission key
- **Fail-closed**: دور غير معروف، مسار غير معرّف، token منتهي، session بدون role
- **WebAuthn end-to-end**: register options → register verify → auth options → auth verify → revoke، إخفاء credential hashes
- **إدارة الجلسة**: refresh token، silent renewal، idle timeout، logout on tab close؟
- **Closed-year override**: من يستطيع التعديل؟ UI block + DB block
- **`sessionStorage` vs `localStorage`** لـ fiscal_year_id (الذاكرة تُلزم session)
- **Impersonation/session leakage**: switching tabs، multi-account
- **Password reset flow + email confirmation**
- **Rate limiting** على auth attempts
- **OAuth providers** (Google) إن مفعّل
- **Biometric edge cases**: device change، multiple credentials، lost device

### المخرج
`02-routing-auth-permissions.md` + `matrices/permissions-heatmap.csv` (4×60)

---

## الموجة 3 — لوحة الناظر: الواجهات والأزرار والمكونات (Admin UI Deep Dive)

### النطاق
- `src/pages/dashboard/*.tsx` (32 صفحة + اختبارات)
- `src/components/layout/**` (Sidebar/{Brand,NavList,UserFooter}, Header, DashboardLayout, BottomNav, MobileSidebar)
- `src/components/admin/**`
- `src/components/common/**` (ExportMenu, FeatureGate, DashboardSkeleton, DeferredRender, NoPublishedYearsNotice...)
- `src/components/ui/**` (shadcn — فقط المستخدمة في اللوحة)
- `src/components/charts/**`، `src/components/forms/**`، `src/components/tables/**`، `src/components/modals/**` (المستخدمة في اللوحة)
- `src/hooks/page/admin/**` (accounts, contracts, dashboard, financial, management, messaging, properties, reports, settings)
- `src/hooks/ui/**` المستخدمة في اللوحة

### محاور الفحص لكل صفحة × كل زر × كل tab
1. **Wiring**: handler حقيقي vs placeholder/TODO/console
2. **Permissions** client+server
3. **Loading/Error/Empty** + skeleton + toast عربي + retry
4. **Page Hook Pattern** — UI logic-less
5. **حجم ≤200/180 سطر** + Container vs Presentational
6. **a11y/RTL/Mobile** — aria، tab order، focus trap، swipe، breakpoints (320/375/768/1024/1366/1920)
7. **الأداء**: lazy + DeferredRender + staleTime + re-renders + memo on table rows فقط
8. **اتساق المصطلحات** الشرعية + لا "بيع"
9. **Dark mode** + Print stylesheet
10. **Keyboard shortcuts** (Cmd+K, Esc, Enter on forms)
11. **Form validation** Zod + react-hook-form + رسائل عربية
12. **Optimistic updates** vs invalidation strategy
13. **Empty CTA**: ماذا يحدث للصفحة عند صفر بيانات؟

### المخرج
`03-admin-dashboard.md` + `matrices/admin-pages-axes.csv` (32 صفحة × 13 محور) + `unwired-buttons.csv` + screenshots دليلية إن لزم

---

## الموجة 4 — لوحات المستفيد/الواقف/العامة + PWA + Mobile (Other Surfaces)

### النطاق
- `src/pages/beneficiary/**` + tests
- `src/pages/waqif/**` + `src/components/waqif/**`
- `src/pages/{Index,Auth,ResetPassword,NotFound,Unauthorized,PrivacyPolicy,TermsOfUse,InstallApp,PublicPages}.tsx` + tests
- `src/components/beneficiary/**`, `src/components/landing/**`, `src/components/public/**`
- `src/hooks/page/beneficiary/**`
- `src/constants/beneficiaryCopy.ts`, `beneficiaryWidgets.ts`, `featureVisibilityRegistry.ts`
- PWA assets: manifest، service worker، install prompt، push permission flow
- `docs/pwa-update-qa.md`, `docs/notifications-qa.md`

### محاور الفحص
- **PII isolation**: مستفيد لا يرى بيانات مستفيد آخر (RLS + UI)
- **FeatureGate/featureVisibilityRegistry** يعمل فعلاً
- **Landing public_stats_anonymization** (auto/manual/hidden) عبر `app_settings`
- **الواقف**: لا يرى هويات/حسابات بنكية
- **عربي صحيح + RTL + لا "بيع"**
- **مسارات عامة بدون مصادقة** (`/install`, `/privacy`, `/terms`, `/`)
- **Notifications permission flow** (denied/granted/default)
- **PWA install** على iOS/Android/Desktop
- **Service Worker**: cache strategy، update flow، offline fallback
- **Push notifications**: VAPID، subscription، delivery
- **Mobile gestures**: swipe sidebar، pull-to-refresh
- **Auth flows public**: signup blocked، reset، magic link
- **Disclosure page**: محتوى قانوني محدّث

### المخرج
`04-beneficiary-waqif-public-pwa.md`

---

## الموجة 5 — منطق الأعمال، الهوكات، المكتبات، الأنواع، الثوابت (Logic Layer)

### النطاق
- `src/hooks/data/**` (financial, settings/{app,permissions,waqf,...}, audit, content, email, dashboard, users, core)
- `src/hooks/domain/**` (financial)
- `src/hooks/application/**`
- `src/hooks/ui/**`, `src/hooks/auth/**` (المتبقّي من W2)
- `src/lib/**` (queryKeys, queryStaleTime, monitoring/{queryMonitor,initQueryMonitoring}, api/invoke, navigation, cn, logger, diagnostics/**, lazyWithRetry, ...)
- `src/utils/**` (دوال نقية فقط — لا supabase/toast)
- `src/types/**` (financial, forms, dashboard, models, relations, invoices, annualReport, advance, bylaws, landing, navigation, notifications, sorting, ui, zatca, data/crudFactory)
- `src/constants/**` (المتبقّي بعد W2)
- `src/contexts/**` (للقراءة + tests)
- `src/integrations/supabase/viewHelper.ts`

### محاور الفحص
- **مطابقة 50 قاعدة من `mem://index` × التطبيق الفعلي** (جدول مفصّل)
  - التسلسل المالي + Carryforward + Largest Remainder
  - Revenue Recognition + Accrual Table + Allocation v3
  - Universal Fiscal Filter + Closed Year + Renewal PII
  - Balance Sheet + Net Cash Flow + Net Share + Negative Guards
  - Invoice Pagination + Deletion Safety + ZATCA ICV
  - Distribution Authority + Advance Limits + Reopen Policy
  - Public Stats + Accountant Filter + Beneficiary Widgets
- **Hooks Layering**: data خام / domain حساب / page تنسيق / application مشتركة (لا اختلاط)
- **No-toast-in-data-hooks** (ESLint gate موجود؟ تطبيقه؟)
- **lib vs utils boundary** (decision tree)
- **Barrel import rule** (لا barrel→barrel)
- **Container vs Presentational** (حدود 200/180، props ≥5 مجمّعة)
- **staleTime** مناسب لكل query
- **queryKeys factory consistency** (لا inline strings)
- **Circular dependencies** (madge/dpdm scan)
- **Unused exports/dead code** (ts-prune)
- **`any`/`@ts-ignore`/`@ts-expect-error` count + justification**
- **CRUD factory usage** على الجداول الجديدة
- **Idempotency** على mutations حسّاسة (distribution, close-year)
- **Race conditions**: double-click submit، concurrent edits

### المخرج
`05-business-logic-hooks.md` + `matrices/business-rules-compliance.csv` (50 قاعدة)

---

## الموجة 6 — الخلفية: Edge Functions، قاعدة البيانات، التخزين، Realtime، Cron (Backend)

### 6.أ — Edge Functions (~16 وظيفة)
- `admin-manage-users/**` (10 handlers + validators)
- `webauthn/**` (4 handlers + helpers)
- `zatca-xml-generator/`, `generate-invoice-pdf/`, `generate-voucher-pdf/`
- `email-admin/`, `process-email-queue/`, `auth-email-hook/`
- `dashboard-summary/`, `multi-year-summary/`, `year-comparison-summary/`
- `check-contract-expiry/`, `guard-signup/`, `lookup-national-id/`, `health-check/`, `ai-assistant/`
- `_shared/**` (cors, auth, maskEmail, email-constants, email-templates/{6 templates}, arabic-reshaper, xml-c14n, zatca-qr-tlv) + tests

**محاور:**
- `getUser()` فقط (لا `getSession()`)
- Zod safeParse + رد 400 موحّد عربي
- CORS لكل origin (preview, published, custom domain)
- Rate limiting per-key + per-IP
- تعقيم رسائل الأخطاء (لا تسرّب DB internals)
- لا استخدام `SUPABASE_SERVICE_ROLE_KEY` كبديل مصادقة
- Logging via logger + masking PII
- Idempotency keys على العمليات المالية
- Timeouts + retries + circuit breaker
- Cold start time + bundle size
- Deno permissions (`--allow-net`, `--allow-env`) دقيقة

### 6.ب — قاعدة البيانات (42 جدول/عرض + 32 دالة + 29 trigger + migrations)
- **لكل جدول من الـ 42**:
  - RLS enabled؟ Policies تستخدم `has_role(auth.uid(),...)` لا `jwt_role()`؟
  - GRANT لكل role (anon/authenticated/service_role) — مطابق للسياسات؟
  - Fail-closed عند غياب policy
  - PII columns مشفّرة (pgcrypto AES-256)؟ Index على encrypted?
  - Foreign key على CASCADE/RESTRICT صحيح؟
  - NOT NULL على أعمدة `user_id`/`fiscal_year_id`/مالية حرجة
  - Indexes موجودة على أعمدة الفلترة الشائعة
  - Unique constraints على الأعمدة المتوقّعة
- **32 دالة مخزّنة**: SECURITY DEFINER + `SET search_path = public` + STABLE/IMMUTABLE حسب الحالة
- **29 trigger**: validation triggers بدل CHECK زمنية، لا triggers ركيكة على audit
- **Views**: `contracts_safe` security_invoker=false مقصود (موثّق)
- **`audit_log`** غير قابل للتعديل/الحذف (`USING(false)`)
- **`supabase/migrations/**`**: آخر 30 migration — GRANT + RLS + naming
- **Referential integrity**: orphan rows scan على الجداول المالية
- **Financial reconciliation**: مجموع الفواتير = مجموع المدفوعات + المتبقّي؟
- **Backups & retention** (سياسة Lovable Cloud الافتراضية)
- **Soft delete vs hard delete** consistency

### 6.ج — التخزين والـ Realtime والـ Cron
- **Storage buckets** (`waqf-assets` public مقصود + سياسات upload)
- **Realtime channels** (notifications, messages) — RLS على publication
- **Cron jobs**: `check-contract-expiry`, `process-email-queue`, `health-check` — schedule، failure handling، idempotency
- **Webhooks خارجية** إن وُجدت (Resend events)

### 6.د — التكاملات الخارجية
- **ZATCA**: ICV chain integrity، QR TLV order، XML c14n، ECDSA P-256 signature، CSID renewal
- **Lovable AI Gateway** (Gemini): quota، prompt safety، PII masking في prompts (`ai-assistant/privacy-ranges.ts`)
- **Resend/Email**: SPF/DKIM/DMARC، bounce handling، suppression list، template rendering (6 قوالب)
- **PWA push**: VAPID keys rotation، subscription cleanup
- **PDF generation**: jsPDF + arabic-reshaper + خطوط (Amiri/Tajawal) — حجم الناتج، الوقت

**أدوات:** `supabase--linter`, `supabase--db_health`, `supabase--slow_queries`, `supabase--read_query`, `supabase--edge_function_logs`, `supabase--test_edge_functions`, `supabase--cloud_status`.

### المخرج
`06-backend-db-integrations.md` + `matrices/db-tables-rls-grant.csv` + `edge-functions-axes.csv` + `proposed-indexes.sql`

---

## الموجة 7 — الأمن، الأداء، الاختبار، الامتثال، الملاحظة، التركيب النهائي

### 7.أ — الأمن (OWASP + PDPL)
- `security--run_security_scan` + `get_table_schema` + `get_scan_results`
- مراجعة `security-memory` الحالية والتحديث المقترح
- `scripts/security-gates.mjs` تغطية فعلية
- CSP / `public/_headers` / CORS لكل origin
- Secrets inventory عبر `secrets--fetch_secrets` (أسماء فقط)
- **OWASP Top 10 mapping**:
  - A01 Broken Access Control (RLS coverage)
  - A02 Cryptographic Failures (AES-256 columns)
  - A03 Injection (RPC params، dynamic SQL)
  - A04 Insecure Design (financial flows)
  - A05 Misconfig (CORS, headers)
  - A07 Auth Failures (rate limit, MFA)
  - A08 Data Integrity (audit log, idempotency)
  - A09 Logging & Monitoring
  - A10 SSRF (Edge Functions external calls)
- **IDOR**: تجربة الوصول لـ id ليس ملكك
- **Mass assignment**: forms ترسل أعمدة محظورة
- **CSRF**: SameSite cookies + Origin check
- **XSS**: dangerouslySetInnerHTML scan + Markdown rendering
- **PDPL سعودي**: حقوق المستفيد (وصول/حذف/تصحيح)، احتفاظ بالبيانات

### 7.ب — الأداء
- `browser--performance_profile` على المسارات: `/`, `/dashboard`, `/dashboard/properties`, `/dashboard/contracts`, `/dashboard/income`, `/dashboard/expenses`, `/dashboard/distributions`, `/beneficiary`, `/waqif`
- Web Vitals: FCP, LCP, CLS, INP + heap + DOM size
- جذر `dashboard-summary` بطيء 7.4s — EXPLAIN ANALYZE + plan
- Bundle size analysis: lazy chunks، vendor، duplicates، unused
- Network waterfall + preconnect efficacy
- Image optimization (formats, lazy, sizes)
- Font loading strategy
- React Query cache hit rate
- `browser--start_profiling`/`stop_profiling` على تفاعلات بطيئة

### 7.ج — الاختبار والجودة
- جرد كل `*.test.ts(x)` + Deno tests (`*_test.ts`) + coverage
- `vitest run` كامل + قراءة نتائج
- `supabase--test_edge_functions` على كل وظيفة لها tests
- `dependency_scan` + `npm audit`
- `audit/conventions-deep-violations.csv` تحليل
- ESLint gates ضد supabase خام في pages
- TS errors count عبر `tsc --noEmit`
- Missing test coverage على hooks/edge functions حرجة
- E2E absence — توصية بـ Playwright إن مطلوب

### 7.د — Observability & Operations
- Logging strategy (logger usage، PII masking، log levels)
- Error tracking (Sentry/equivalent integration؟)
- Analytics/telemetry (هل موجود؟)
- Health check coverage الفعلي
- Diagnostics page (`SystemDiagnosticsPage`) شامل؟
- Slow query alerts، edge function alerts
- Deployment pipeline + rollback procedure

### 7.هـ — التوثيق والمحتوى
- `docs/**` كامل: api/cors-verification, auth/role-source, diagnostics/**, notifications-qa, pwa-update-qa, security/views
- `AGENTS.md`, `CONTRIBUTING.md`, `LICENSE`, `README` (إن وُجد)
- `.lovable/audit-2026-05-27.md` vs الواقع
- `.lovable/memory/**` تطابق مع `mem://index`
- `audit/**` السابق: ما الذي ما زال صالحاً، ما الذي تخطّاه الزمن

### 7.و — التركيب النهائي
- `00-EXECUTIVE-SUMMARY.md` — لوحة كبيرة بكل النتائج
- `findings-master.csv` — كل النتائج عبر الموجات السبع
- خارطة طريق إصلاح: Fix-Wave-1 (Critical) → Fix-Wave-N
- Coverage matrix: ملفات مفحوصة / إجمالي الملفات (مع نسبة مئوية لكل مجلد)
- Dead code candidates list
- Top 20 quick wins
- Top 10 strategic refactors
- Risk register

### المخرج
`07-security-perf-tests-synthesis.md` + `00-EXECUTIVE-SUMMARY.md` + كل المصفوفات

---

## بنية المخرجات النهائية

```text
audit/forensic-2026-06-15/
├── 00-EXECUTIVE-SUMMARY.md
├── 01-foundation.md
├── 02-routing-auth-permissions.md
├── 03-admin-dashboard.md
├── 04-beneficiary-waqif-public-pwa.md
├── 05-business-logic-hooks.md
├── 06-backend-db-integrations.md
├── 07-security-perf-tests-synthesis.md
├── matrices/
│   ├── permissions-heatmap.csv         (W2)
│   ├── admin-pages-axes.csv            (W3 — 32×13)
│   ├── unwired-buttons.csv             (W3)
│   ├── business-rules-compliance.csv   (W5 — 50 rules)
│   ├── db-tables-rls-grant.csv         (W6 — 42 tables)
│   ├── edge-functions-axes.csv         (W6 — 16 fns)
│   ├── owasp-top10-mapping.csv         (W7)
│   ├── coverage-ledger.csv             (كل الموجات)
│   └── findings-master.csv             (كل المشاكل)
└── evidence/
    ├── slow-queries.json
    ├── web-vitals.json
    ├── security-scan.json
    ├── linter-output.json
    ├── proposed-indexes.sql
    ├── vitest-report.json
    └── deno-test-report.json
```

---

## جدولة التنفيذ المقترحة

| الموجة | حجم تقديري | تبعية |
|--------|------------|--------|
| W1 Foundation/DX | 1 جلسة | — |
| W2 Routing/Auth/RBAC | 1 جلسة | W1 |
| W3 Admin UI | 2 جلسات | W2 |
| W4 Beneficiary/Waqif/Public/PWA | 1 جلسة | W2 |
| W5 Business Logic & Hooks | 2 جلسات | W3, W4 |
| W6 Backend/DB/Storage/Realtime/Cron/Integrations | 2-3 جلسات | W5 |
| W7 Security/Perf/Tests/Docs/Synthesis | 1-2 جلسة | كل ما سبق |

---

## ما لن يحدث في كل الموجات السبع

- ❌ لا تعديل كود
- ❌ لا migrations جديدة
- ❌ لا تعديل ملفات محمية
- ❌ لا كشف أسرار
- ❌ لا إجراءات تدميرية على الإنتاج
- ❌ لا تشغيل scripts state-changing

---

## السؤال قبل البدء

أكّد لي:
1. **الترتيب**: W1 → W7 بالتسلسل، أم البدء بـ W3 (لوحة الناظر) ثم التوسّع؟
2. **التشغيل**: موجة/جلسة، أم موجتان متتاليتان دفعة واحدة؟
3. **هل أُضيف موجة 8 اختيارية** لمراجعة المهاجرات التاريخية (`supabase/migrations/**` كامل، ليس فقط آخر 30)؟
