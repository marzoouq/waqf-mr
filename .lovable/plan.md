
## فحص جنائي شامل — النتائج والتوصيات

تم إجراء مسح مباشر على الكود الفعلي في `main`. فيما يلي كل المشاكل مصنفة بالخطورة مع الملفات المصدر، ثم خطة معالجة قابلة للتنفيذ.

---

### 🔴 حرجة (Blockers للـ push النهائي)

| # | المشكلة | الملف/الدليل | الأثر |
|---|---------|--------------|-------|
| C1 | `.env` ما زال متتبَّعاً في git | `.env` (git ls-files أكّده) | ملف يحوي anon key وproject ref مكشوف في التاريخ. `.gitignore` يستثنيه لكنه أُضيف قبل الاستثناء |
| C2 | `bun.lock` عاد (337KB) رغم `packageManager: "npm@11.6.2"` | `bun.lock` | مصدر تشتت في auto-version + انحراف lockfile |
| C3 | انحراف إصدارات: `package.json = 3.0.376` مقابل `package-lock.json = 3.0.373` | `package.json`, `package-lock.json` | `scripts/dependency-drift-check.mjs` يفشل → pre-push يُحجب |

### 🟠 عالية

| # | المشكلة | الملف/الدليل |
|---|---------|--------------|
| H1 | `npm audit` معطَّل على مرآة Lovable الداخلية (404) — لا يمكن تشغيله محلياً | يجب الاعتماد على workflow `security-audit.yml` (يعمل على سجل npmjs الأصلي) أو `code--dependency_scan` |
| H2 | لا يوجد حقل `engines` في `package.json` | `package.json` — يترك مطوّرين على Node/npm غير متوافقة |
| H3 | 14 استخدام `console.*` في `src/` رغم قاعدة "Never use console.log" | `src/**` (باستثناء `src/lib/logger.ts` المشروع) |
| H4 | 29 استخدام `any`/`as any` في `src/` | `src/**` |

### 🟡 متوسطة

| # | المشكلة | الملف |
|---|---------|-------|
| M1 | حزم قديمة قابلة للترقية (@radix-ui × 15 patch، `@supabase/supabase-js` patch، `@vitejs/plugin-react-swc` major متاح) | `package.json` |
| M2 | 4 ملفات تحوي `TODO/FIXME/XXX/HACK` | `src/**` |

### 🟢 معلوماتية (لا تتطلب فعلاً)

- لا مطابقات لأنماط أسرار خطيرة (Stripe, AWS, GitHub, Slack, PRIVATE KEY blocks) في الكود.
- `.env.example` نظيف بلا قيم حقيقية.
- JWT الظاهر في `src/lib/diagnostics/sanitize.test.ts` = fixture اختبار متوقّع.
- كل الظهورات لكلمة `service_role` مشروعة (migrations, docs, edge functions مرخّصة في allowlist).
- Edge Functions (22 وظيفة) متوافقة مع `SECURITY.md` و`README.md`.
- Husky hooks + CI workflow (`ci.yml`, `security-audit.yml`) قوية: gitleaks + drift check + security gates مفعّلة.

---

## خطة التنفيذ (بعد الاعتماد والانتقال لوضع البناء)

### الخطوة 1 — إصلاحات lockfile (C2 + C3)
```bash
rm -f bun.lock
npm install --package-lock-only --ignore-scripts
```
النتيجة: `bun.lock` محذوف، والإصدارات الثلاثة (`package.json` / `package-lock.json` root / `packages[""]`) = `3.0.376`.

### الخطوة 2 — إضافة `engines` (H2)
تحديث `package.json` بإضافة:
```json
"engines": { "node": ">=22.0.0", "npm": ">=10.0.0" }
```

### الخطوة 3 — تقرير جنائي موثَّق (H3 + H4 + M1 + M2)
كتابة `audit/forensic-report.md` يحوي:
- قائمة كاملة (ملف:سطر) لكل `console.*` في `src/`.
- قائمة كاملة لكل `any`/`as any`.
- قائمة الحزم القديمة من `npm outdated`.
- قائمة TODO/FIXME.
- توصيات معالجة كل بند (بدون تعديل الكود — للمراجعة اليدوية لتفادي كسر إنتاجي).

### الخطوة 4 — تشغيل بوابات التحقق
```bash
node scripts/dependency-drift-check.mjs
node scripts/count-edge-functions.mjs --check
node scripts/security-gates.mjs
test ! -f bun.lock && echo "✅ bun.lock removed"
```

### الخطوة 5 — تحديث `.lovable/plan.md`
بحالة النهائية للإغلاق (بما فيها بند `.env` المفتوح للمالك).

---

## خارج نطاق التنفيذ التلقائي

| البند | السبب |
|-------|-------|
| `git rm --cached .env` (C1) | أوامر git stateful ممنوعة داخلياً — يجب أن ينفّذها مالك المستودع يدوياً |
| ترقيات major (`@vitejs/plugin-react-swc 3→4`, `@eslint/js 9→10`, `@types/node 25→26`) | تحتاج مراجعة breaking changes — طلب المستخدم صريح مطلوب |
| تعديل ملفات المصادقة/`supabase/config.toml`/`client.ts`/`types.ts` | محمية بأوامر المشروع |
| إعادة كتابة `console.*` أو `any` تلقائياً | يتطلب مراجعة سياق كل موقع — يُدرج في التقرير للمعالجة اليدوية |

---

## معيار النجاح النهائي

- ✅ `test ! -f bun.lock` ينجح
- ✅ الإصدارات الثلاثة = `3.0.376`
- ✅ `dependency-drift-check.mjs` يمر
- ✅ `count-edge-functions.mjs --check` يمر
- ✅ `security-gates.mjs` = 0 مخالفات
- ✅ `engines` مضاف
- ✅ `audit/forensic-report.md` جاهز
- ⏳ `.env` مفتوح حتى ينفّذ المالك:
  ```bash
  git rm --cached .env
  git commit -m "chore(security): untrack .env"
  ```
