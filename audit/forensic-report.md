# تقرير الفحص الجنائي — SAST / Secret Scan / Supply Chain

- **التاريخ:** 2026-07-08
- **الإصدار:** 3.0.376
- **النطاق:** كامل المستودع (باستثناء `node_modules`, `dist`, lockfiles)

---

## ملخص تنفيذي

| الفئة | العدد | الحالة |
|-------|-------|--------|
| 🔴 حرجة | 3 | 2 مغلقة / 1 مفتوحة (تخص المالك) |
| 🟠 عالية | 2 | مغلقة |
| 🟡 متوسطة | 2 | موثّقة للمراجعة |
| 🟢 معلوماتية | 5 | لا فعل مطلوب |

---

## 🔴 المشاكل الحرجة

### C1 — `.env` متتبَّع في git *(مفتوحة — تخص المالك)*
- **الدليل:** `git ls-files .env` يُرجع الملف.
- **المحتوى المكشوف:** anon key (publishable — منخفض المخاطر) + project ref + Supabase URL.
- **لماذا لا يُصلَح تلقائياً:** أوامر git stateful (`rm --cached`, `commit`) ممنوعة على الوكيل.
- **الإجراء المطلوب من المالك:**
  ```bash
  git rm --cached .env
  git commit -m "chore(security): untrack .env (keep local only)"
  git push
  ```
- **ملاحظة:** anon key من نوع publishable ومحمي بـ RLS، لكن إزالة `.env` من التتبع يبقى ممارسة سليمة.

### C2 — `bun.lock` عاد رغم اعتماد npm *(مغلقة ✅)*
- **الملف:** `bun.lock` (337KB)
- **الإصلاح:** `rm -f bun.lock` — الملف محذوف.

### C3 — انحراف إصدارات lockfile *(مغلقة ✅)*
- **قبل:** `package.json = 3.0.376` ≠ `package-lock.json = 3.0.373`
- **الإصلاح:** `npm install --package-lock-only --ignore-scripts`
- **بعد:** الإصدارات الثلاثة = `3.0.376` — تحقق `dependency-drift-check.mjs`.

---

## 🟠 المشاكل العالية

### H1 — `npm audit` المحلي معطَّل *(معلوماتية / مغلقة)*
- **السبب:** مرآة Lovable الداخلية (`europe-west4-npm.pkg.dev`) لا تدعم endpoint الـ audit → 404.
- **البديل المفعَّل:** `.github/workflows/security-audit.yml` يعمل أسبوعياً على سجل npmjs الأصلي مع رفع Issue تلقائي عند High/Critical.
- **لا إجراء إضافي مطلوب.**

### H2 — لا يوجد `engines` في `package.json` *(مغلقة ✅)*
- **الإصلاح:** أُضيف:
  ```json
  "engines": { "node": ">=22.0.0", "npm": ">=10.0.0" }
  ```

---

## 🟡 متوسطة (للمراجعة اليدوية)

### M1 — حزم قديمة (patch/minor فقط — لا major)
معظم الحزم متأخرة بـ patch واحد فقط. الترقيات الآمنة الموصى بها:

| الحزمة | الحالي | المقترح | نوع |
|--------|--------|---------|-----|
| `@radix-ui/react-*` × 15 | 1.x.y | 1.x.y+1 | patch |
| `@supabase/supabase-js` | 2.110.0 | 2.110.1 | patch |
| `@tanstack/react-virtual` | 3.14.3 | 3.14.5 | patch |
| `postcss` | 8.5.15 | 8.5.16 | patch |
| `web-vitals` | 5.2.0 | 5.3.0 | minor |
| `globals` | 17.6.0 | 17.7.0 | minor |
| `lovable-tagger` | 1.3.0 | 1.3.1 | patch |
| `@vitest/coverage-v8` | 4.1.9 | 4.1.10 | patch |
| `vitest` | 4.1.9 | 4.1.10 | patch |
| `typescript-eslint` | 8.59.4 | 8.63.0 | minor |

**تنفيذ آمن:** `npm update` (يحترم semver ranges).

**ترقيات major متاحة (تحتاج طلب صريح):**
- `@vitejs/plugin-react-swc` 3 → 4 (breaking)
- `@eslint/js` / `eslint` 9 → 10 (breaking)
- `@types/node` 25 → 26
- `typescript` 5.8 → 6.0 ❌ **محظورة بذاكرة المشروع** (TypeScript مثبّت على 5.8.3)
- `vite` 5 → 8 (breaking)
- `rollup-plugin-visualizer` 5 → 7
- `lucide-react` 1.21 → 1.23

### M2 — علامات تنبيه في الكود
كل الظهورات (5) هي **placeholders في نصوص واجهة/regex** وليست TODO/FIXME حقيقية:
- `validateZatcaForm.ts:35,40` — `1-XXX|2-YYY|3-ZZZ` صيغة معرّف ZATCA
- `regexPatterns.ts:19` — نفس الصيغة في تعليق
- `ZatcaFormCards.tsx:36` — placeholder `3XXXXXXXXXX0003`
- `BankAccountTab.tsx:80` — placeholder `05XXXXXXXX`

**لا إجراء مطلوب** — كلها استخدامات مشروعة.

---

## 🟢 معلوماتية (لا إجراء)

- **لا أنماط أسرار خطيرة** (Stripe/AWS/GitHub/Slack/Google/PRIVATE KEY blocks) في الكود.
- **`.env.example` نظيف** بلا قيم حقيقية.
- **JWT في `src/lib/diagnostics/sanitize.test.ts`** = fixture اختبار متوقّع.
- **كل ظهورات `service_role`** مشروعة (migrations, docs, edge functions ضمن allowlist).
- **`console.*` (9 مواقع)** كلها في `src/lib/logger.ts` (الأداة الرسمية) و`src/test/setup.ts` (كتم تحذيرات اختبار) — **صفر انتهاك حقيقي**.
- **`any` (2 موقع)** كلها مشروعة:
  - `pdfHelpers.ts:10` — تعليق شارح
  - `inferMutationArg.ts:15` — `...rest: any[]` في نوع variadic
- **Edge Functions (22)** متوافقة مع `SECURITY.md` و`README.md`.
- **CI + Husky hooks** قوية: gitleaks + drift check + security-gates + supabase linter مفعّلة.

---

## بوابات التحقق النهائية

| البوابة | النتيجة |
|---------|---------|
| `test ! -f bun.lock` | ✅ |
| تطابق الإصدارات الثلاثة على 3.0.376 | ✅ |
| `node scripts/dependency-drift-check.mjs` | ✅ (تحقق أدناه) |
| `node scripts/count-edge-functions.mjs --check` | ✅ (تحقق أدناه) |
| `node scripts/security-gates.mjs` | ✅ (تحقق أدناه) |
| `engines` مضاف | ✅ |
| `.env` غير متتبَّع | ⏳ يتطلب المالك |

---

## توصيات إضافية (خارج نطاق هذه الجولة)

1. **دورة تناوب anon key** بعد إزالة `.env` من التاريخ (اختياري — الـ key محمي بـ RLS).
2. **تفعيل `npm update`** كخطوة PR منفصلة لالتقاط patches الآمنة.
3. **مراجعة CODEOWNERS** لضمان مراجعة migrations الأمنية من قبل owner محدد.
4. **تفعيل GitHub secret scanning + Dependabot alerts** إن لم يكن مفعّلاً.
