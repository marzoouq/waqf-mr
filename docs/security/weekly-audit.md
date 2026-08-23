# الفحص الأمني الأسبوعي

يُشغَّل workflow `security-audit.yml` كل أحد 03:00 UTC ويدوياً عبر `workflow_dispatch`.

## ما يفحصه

1. **Version drift** — `scripts/dependency-drift-check.mjs` يتحقق أن `package.json.version` = `package-lock.json.version`.
2. **Doc drift** — `scripts/count-edge-functions.mjs --check` يتحقق أن markers في `README.md` و`SECURITY.md` تطابق العدد الفعلي لـ Edge Functions.
3. **npm audit** — `npm audit --omit=dev --audit-level=high` على تبعيات الإنتاج فقط.

## قراءة التقرير

- الـ artifact `npm-audit-report` يحوي `npm-audit.json` (تنسيق npm الرسمي).
- عند وجود high/critical → يُفتح Issue تلقائياً بلاصقتَي `security` و`auto`.
- الحقل `metadata.vulnerabilities` يعطي عدد الثغرات لكل مستوى.

## سياسة المعالجة

1. **Critical** — PR إصلاح خلال 48 ساعة، يتّبع بروتوكول `CONTRIBUTING.md` (`tsgo` + `vitest run` + `eslint` + `build` + checkpoint).
2. **High** — PR إصلاح خلال 7 أيام.
3. **Moderate / Low** — تُجمَّع في PR شهري (dependabot ينشئها تلقائياً حسب `.github/dependabot.yml`).
4. **قبول مخاطر مؤقت** — إذا لم يتوفّر upgrade، وثّق السبب في نفس Issue وأضف marker `accepted-risk` مع تاريخ إعادة المراجعة (≤ 30 يوم).

## Drift محلي قبل push

`.husky/pre-push` يستدعي `dependency-drift-check.mjs` تلقائياً. لتشغيله يدوياً:

```bash
node scripts/dependency-drift-check.mjs
node scripts/count-edge-functions.mjs --check
```

للإصلاح:

```bash
npm install --package-lock-only            # مزامنة lockfile
node scripts/count-edge-functions.mjs --write   # مزامنة الوثائق
```

## المراجع

- `SECURITY.md` — سياسة الأمن العامة.
- `CONTRIBUTING.md` — بروتوكول ما قبل الدفع الإلزامي.
- `.github/dependabot.yml` — تحديثات dependencies الأسبوعية.

## بوابة أمان التبعيات في CI (مفعّلة)

- الأمر: `npm run security:deps` (`scripts/dependency-security-gate.mjs`).
- تعمل في **كل Pull Request** داخل `ci.yml` وفي الفحص الأسبوعي `security-audit.yml`.
- **ترفض الدمج** (exit 1) عند أي ثغرة `high` أو `critical` في تبعيات الإنتاج. ثغرات dev-only غير حاجزة إلا مع `--strict-dev` / `STRICT_DEV=true`.
- تفشل أيضاً (exit 2) إذا تعذّر تشغيل `npm audit` — fail-closed.
- المخرجات: `audit/dependency-security.json` + `audit/dependency-security.md`، تُرفع كـ artifact `dependency-security-report` (90 يوماً)، وتُلخَّص في Job Summary، وتُنشر كتعليق مُحدَّث على الـ PR.
- كل تقرير يربط أحدث ملفات `docs/security/SECURITY-SCAN-*.md` لمقارنة الاتجاه قبل/بعد التحديثات.
