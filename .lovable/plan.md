# الفحص الجنائي الشامل — نظام إدارة وقف مرزوق بن علي الثبيتي

## 1. النتائج الفعلية (مستخرجة الآن من الكود)

### 🔴 حرج (يمنع الإنتاج)

| # | المشكلة | الدليل | الأثر |
|---|---------|--------|-------|
| A1 | `.env` مُتتبَّع في Git رغم وجوده في `.gitignore` | `git ls-files .env` يُرجع `.env` | تسريب بيئة عند أي `git push` |
| A2 | Version drift بين `package.json` و `package-lock.json` | `package.json=3.0.370` بينما `lock=3.0.369` | فشل CI/reproducibility |
| A3 | `.env.example` مُتتبَّع (مقبول) لكن يجب التأكد من عدم احتوائه أسرار | tracked | تحقق مطلوب |

### 🟡 متوسط (يجب معالجته قبل الإطلاق)

| # | المشكلة | الدليل |
|---|---------|--------|
| B1 | 3 ملفات فيها ألوان hex بدل CSS variables (خارج Canvas) | `SignaturePad.tsx` (2 مواضع Canvas مقبولة)، `InvoicePreviewDialog.tsx: CANVAS_BG_COLOR='#ffffff'` — Canvas مقبول لكن يجب توثيقه |
| B2 | ملفات كبيرة تجاوزت 300 سطر (7 ملفات، أغلبها اختبارات) | أكبرها `types.ts` (auto-gen مسموح)، ثم ملفات test |
| B3 | 20 استخدامًا لـ `any` في `src/` | يحتاج مراجعة لكل موضع |
| B4 | 389 migration file — يحتاج توثيق دورة حياة/دمج قديم | `supabase/migrations/` |

### 🟢 نظيف / لا مشاكل

- `console.log/warn/error` — كل الاستخدامات مبررة (logger, test setup, ErrorBoundary suppression) ✅
- npm audit — بدون ثغرات ✅
- 22 Edge Function موثقة ومتطابقة مع README/SECURITY ✅
- `tsconfig.node.json` موثّق ✅
- lockfile syntax سليم (packages[""] متطابق) ✅
- TODO/FIXME حقيقية = 0 (النتائج false-positive تحتوي كلمة مماثلة في تعليقات ZATCA) ✅

### 📋 ملاحظات على المستودع

- `bun.lock` + `package-lock.json` معًا → ازدواجية package managers. المشروع يعلن `packageManager: npm@11.6.2` لذا `bun.lock` يجب حذفه أو توثيق سبب بقائه.
- `dist/`, `build/`, `tsconfig.*.tsbuildinfo` موجودة في checkout — تأكد أنها في `.gitignore` وليست tracked.

---

## 2. خطة الإغلاق (Runbook قابل للنسخ)

### الخطوة 1 — إعادة مزامنة lockfile (وكيل، دقيقة واحدة)

```bash
npm install --package-lock-only --ignore-scripts
node scripts/dependency-drift-check.mjs
```
**قبول**: `package.json` و `lock.version` و `lock.packages[""].version` = `3.0.370`.

### الخطوة 2 — التحقق من `bun.lock` (وكيل، دقيقة)

قرار مطلوب من المالك: **حذف `bun.lock`** (لأن packageManager=npm) أو توثيق لماذا نحتفظ به.

### الخطوة 3 — إلغاء تتبع `.env` (مالك فقط — Git stateful)

```bash
git rm --cached .env
git commit -m "chore(security): untrack .env (keep local only)"
git ls-files --error-unmatch .env    # يجب أن يفشل exit≠0
```
ثم مراجعة محتوى `.env.example` للتأكد أنه لا يحتوي أسرار.

### الخطوة 4 — التأكد من عدم تتبع مخرجات البناء (وكيل)

```bash
git ls-files dist build '*.tsbuildinfo' | head
```
إذا ظهرت نتائج → المالك ينفذ `git rm --cached -r dist build *.tsbuildinfo` + commit.

### الخطوة 5 — تنظيف `any` وملفات hex Canvas (وكيل، PR منفصل بعد الأمان)

- 20 استخدامًا لـ `any` → مراجعة يدوية، إما توثيق `eslint-disable` مع سبب، أو استبدال بنوع دقيق.
- توثيق ألوان Canvas الثلاثة بتعليق `// Canvas context: hex required, not themeable`.

### الخطوة 6 — تدقيق migrations (وكيل، توثيقي)

إنشاء `supabase/migrations/README.md` يوضّح:
- عدد الـ migrations الحالي (389)
- سياسة التسمية والدمج
- تحذير من عدم إعادة تسمية migrations قديمة

### الخطوة 7 — Checklist القبول النهائي (قبل push)

```bash
node -p "require('./package.json').version"
node -p "require('./package-lock.json').version"
node -p "require('./package-lock.json').packages[''].version"
! git ls-files --error-unmatch .env
npm run typecheck
npm run lint
npm run test
npm run audit && npm run audit:gate
npm run docs:edge-count:check
node scripts/dependency-drift-check.mjs
```

كل الأوامر يجب أن تنجح (exit 0) عدا الأمر الرابع الذي يجب أن يفشل.

---

## 3. خارج نطاق هذه الخطة

- محتوى `.env` (المالك يديره خارج المستودع)
- تدوير مفاتيح Supabase (لا يوجد `service_role` في الملف — كل الموجود publishable/anon)
- ملفات محمية: `client.ts`, `types.ts`, `config.toml`, `AuthContext.tsx`, `ProtectedRoute.tsx`
- `auto-version.yml` (السبب الجذري لعودة drift) — قرار المالك: تعطيل أو تعديل ليحدّث lockfile تلقائيًا
- إعادة كتابة Vitest allowlist (PR منفصل كما اتفقنا سابقًا)

---

## 4. الحكم النهائي

- **الأمان**: 🔴 غير جاهز — بسبب A1 فقط
- **الجودة التقنية**: 🟢 عالية — 0 ثغرات، 0 console.log مسيء، توثيق شامل، معمارية Page Hook مطبّقة
- **البنية**: 🟢 مستقرة — 22 Edge Function موثقة، RLS مفعّل، دور واضح
- **بعد تنفيذ الخطوات 1–3**: جاهز للإنتاج ✅

هل أنفّذ الخطوات 1، 2، 4، 5، 6 الآن (كل ما هو غير Git stateful)، وأترك لك الخطوة 3 (git rm)؟
