# خطة إصلاح تدقيق `main` — 3 PRs

بعد فحص فعلي مقابل الكود، جميع بنود التقرير مؤكَّدة. تصحيحات وإضافات مبنية على الفحص:

| البند | ما ذكره التقرير | ما وجدته فعلياً |
|---|---|---|
| version drift | `3.0.364` vs `3.0.354` | ✅ مطابق تماماً |
| عدد Edge Functions | README=18، SECURITY=16 | ⚠️ الفعلي **24** (لا 18 ولا 16) — الانحراف أكبر مما ذُكر |
| lockfile | `package-lock.json` فقط | ⚠️ يوجد **`bun.lock` (337 KB) + `package-lock.json` (452 KB)** — dual lockfile؛ CI يستخدم `npm ci --legacy-peer-deps` |
| vite.config | معقّد | ✅ 230 سطراً — قابل للتهذيب |
| vitest onConsoleLog | كبت واسع | ✅ 8 قواعد `includes()` حرفية، بعضها يخفي `[App Error]` و`Tenant payment error` |
| tsconfig | تعارضات | ✅ مطابق |
| `AGENTS/CONTRIBUTING/SECURITY/ARCHITECTURE.md` | موجودة | ✅ الأربعة موجودة |
| `scripts/security-gates.mjs` | — | ✅ موجود ويُستدعى من `pre-push` |
| workflow أمني دوري | مقترح | ❌ غير موجود (فقط `health-check.yml` و`ci.yml` و`auto-version.yml`) |

القيود المفروضة على الخطة (من ذاكرة المشروع والسياسات):
- ممنوع تعديل `client.ts`, `types.ts`, `supabase/config.toml`, `.env`.
- الأدوار في `user_roles` حصراً — لا تغيير على المصادقة.
- كل PR يتّبع بروتوكول `CONTRIBUTING.md` (`tsgo` + `vitest run` + `eslint` + `build` + checkpoint).

---

## PR #1 — عاجل: version drift + توحيد lockfile + عدّاد Edge Functions (🔴 صغير)

**المشكلة:** `npm ci` غير deterministic، ووجود `bun.lock` بجانب `package-lock.json` قد يُربك بيئات محلية. وثائق تذكر أرقام Edge Functions قديمة (18/16 بينما الفعلي 24).

### الملفات
- `package-lock.json` — تحديث الحقل `version` (المستوى الجذر ومستوى الـ root package) من `3.0.354` إلى `3.0.364` عبر `npm install --package-lock-only --ignore-scripts` بدون تغيير أي dependency.
- `bun.lock` — **حذف** (المشروع رسمياً على npm؛ CI و`pre-push` يستخدمان `npm`؛ إبقاؤه يوهم بدعم مزدوج).
- `.gitignore` — إضافة `bun.lock` و`bun.lockb` كخط دفاع.
- `scripts/count-edge-functions.mjs` (جديد) — يقرأ `supabase/functions/` ويستثني `_shared` والمجلدات المخفية؛ وضعان: طباعة العدد، أو `--check` يقارن مع markers في README/SECURITY.
- `README.md` — استبدال `**18 function**` بـ marker: `<!-- edge-functions:count -->24<!-- /edge-functions:count -->` + قائمة مُولَّدة تلقائياً بأسماء الوظائف الفعلية.
- `SECURITY.md` — نفس marker في العنوان "أمن الوظائف الخلفية".
- `package.json` — إضافة سكربت `"docs:edge-count": "node scripts/count-edge-functions.mjs --write"`.
- `.github/workflows/ci.yml` — خطوة جديدة `Verify docs counts` تشغّل `node scripts/count-edge-functions.mjs --check` وتفشل عند الانحراف.

### التحقق
`npm ci --legacy-peer-deps` بدون تحذير + `npm run audit` + `tsgo` + `vitest run`.

---

## PR #2 — توحيد TypeScript + تشديد Vitest + تهذيب Vite (🟠 متوسط)

### 2.1 توحيد TS
- `tsconfig.base.json` (جديد) — يحوي الخيارات الصارمة المشتركة: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch: true`, `noUncheckedIndexedAccess: true`, `skipLibCheck`, `paths: { "@/*": ["./src/*"] }`.
- `tsconfig.app.json` — `extends: "./tsconfig.base.json"`؛ يُبقي فقط: `lib`, `jsx`, `target`, `module`, `moduleResolution`, `allowImportingTsExtensions`, `isolatedModules`, `moduleDetection`, `useDefineForClassFields`, `types: []`. يُحذف كل خيار مكرر مع الأساس.
- `tsconfig.node.json` — `extends: "./tsconfig.base.json"` مع override موثّق: `noUnusedLocals: false` + `noUnusedParameters: false` (تعليق: "vite.config.ts يحتوي على معاملات build مشروطة").
- `tsconfig.json` — بلا تغيير (references فقط).

### 2.2 تشديد `onConsoleLog`
- `vitest.config.ts` — استبدال قائمة `includes()` بـ:
  - مصفوفة `ALLOWED_TEST_LOG_PATTERNS: { pattern: RegExp; reason: string }[]`.
  - أي log يطابق `/error/i` **ولا** يطابق أحد patterns لا يُكبَت.
  - كل pattern يحمل تعليق سبب.
  - إبقاء الكبت الحقيقي فقط لتحذيرات Radix/act/ProtectedRoute؛ إخفاء `[App Error]` و`Tenant payment error` يُنقَل داخل الاختبارات المعنية عبر `vi.spyOn(console, 'error')` بدلاً من كبت عالمي.

### 2.3 تبسيط `vite.config.ts` (من 230 سطر إلى ~120)
- `build/chunks.ts` (جديد) — تصدير `getManualChunks()` مع تعليق "لماذا" لكل مجموعة (radix, charts, pdf, supabase, jspdf-fonts…).
- `build/pwa-runtime-caching.ts` (جديد) — تصدير `runtimeCaching` array.
- `vite.config.ts` — يستورد الاثنين فقط.
- `src/test/build-chunks.test.ts` (جديد) — snapshot test على مفاتيح `getManualChunks` لمنع كسر صامت.

### التحقق
`tsgo` + `vitest run` (بما فيه snapshot الجديد) + `npm run build` + مقارنة حجم bundle قبل/بعد.

---

## PR #3 — حوكمة أمنية دورية (🟢 أمني، بدون منطق تشغيلي)

### الملفات
- `.github/workflows/security-audit.yml` (جديد) — cron أسبوعي (الأحد) + `workflow_dispatch`:
  1. `npm audit --omit=dev --json` → artifact `npm-audit.json`.
  2. `node scripts/dependency-drift-check.mjs` — يفشل عند انحراف الإصدار.
  3. `node scripts/count-edge-functions.mjs --check` — يفشل عند انحراف الوثائق.
  4. يفتح Issue تلقائياً عند high/critical (label: `security`, `auto`).
- `scripts/dependency-drift-check.mjs` (جديد) — يقرأ `package.json.version` و`package-lock.json.version` ويخرج بـ exit code ≠ 0 عند الاختلاف. مستقل عن npm audit.
- `.husky/pre-push` — إضافة استدعاء `node scripts/dependency-drift-check.mjs` قبل بوابة `audit` الحالية (منع تكرار PR #1 مستقبلاً).
- `docs/security/weekly-audit.md` (جديد) — يوثّق: قراءة artifact، سياسة معالجة CVE (upgrade → PR → checkpoint)، سياسة قبول المخاطر المؤقت، ربط مع `SECURITY.md`.

### التحقق
تشغيل `workflow_dispatch` يدوياً بعد الدمج للتأكد من نجاح المسار كاملاً.

---

## خارج النطاق عمداً

- **`index.html` inline scripts** — يتطلب مراجعة CSP + PWA/SW كاملة (خطر عالٍ). يُؤجَّل لـ PR أمني مستقل.
- **رفع threshold التغطية فوق 60%** — يبقى كما هو لتجنّب تعطيل CI مفاجئ.
- **أي تعديل على AuthContext / RLS / Edge Functions / schema** — لا علاقة بملاحظات التدقيق.
- **استبدال npm بـ bun أو العكس** — قرار استراتيجي منفصل؛ الخطة تُنظّف الحالة الحالية فقط.

---

## ترتيب التنفيذ

1. **PR #1** أولاً (يزيل أعلى خطر ويهيّئ الأرضية).
2. **PR #2** بعد استقرار #1.
3. **PR #3** أخيراً (يعتمد على `dependency-drift-check.mjs` الذي أُنشئ في #1؟ لا — يُنشأ هنا لأن #1 يعالج الحالة، و#3 يمنع التكرار).

كل PR: `tsgo` + `vitest run` + `eslint` + `npm run build` + checkpoint موثّق قبل الدفع، وفق `CONTRIBUTING.md`.
