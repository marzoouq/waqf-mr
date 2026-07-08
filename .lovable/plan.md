
## تحقق مباشر من الخطة مقابل الكود الفعلي ✅

كل ادعاء في الخطة الخمس مؤكَّد بالمعاينة الحرفية للملفات:

| # | الملف | السطر/المقتطف الحالي | التشخيص | الحالة |
|---|-------|-----------------------|----------|--------|
| 1 | `.github/workflows/auto-version.yml:131` | `git add package.json public/changelog.json` | لا يشمل `package-lock.json` — سبب drift مؤكد | ✅ صحيح |
| 2 | `.github/workflows/ci.yml` (Block tracked secret env) | `grep -E '^\.env\..+$'` | regex يتطلب نقطة+حرف بعد `.env` → لا يلتقط `.env` نفسه | ✅ صحيح |
| 3 | `.husky/pre-commit:16` | `grep -E '(^\|/)\.env\..+$'` | نفس القصور | ✅ صحيح |
| 4 | `.husky/pre-push:20` | `grep -E '(^\|/)\.env\..+$'` | نفس القصور | ✅ صحيح |
| 5 | `.github/workflows/test.yml:37` | `grep -c '"severity":"high"\|"severity":"critical"' audit-report.json` | تحليل JSON بـ grep — هش (يمكن أن يظهر داخل نصوص أخرى) | ✅ صحيح |

### تحقق إضافي

- `scripts/dependency-drift-check.mjs` يُستدعى في `pre-push` و`security-audit.yml` — لن يحتاج تعديل، فقط `auto-version.yml` هو الذي يُحدث سبب المشكلة.
- `.env.example` مستثنى بالفعل عبر `grep -v '\.example$'` — الاستثناء سيبقى ساري بعد التوسيع.
- لا يوجد استخدام آخر لـ `.env\..+$` في المستودع (فحصت `.husky/`, `.github/workflows/`).

### الخطة تبقى كما هي — 5 تعديلات دقيقة

1. **`.github/workflows/auto-version.yml`** — بعد خطوة "Bump patch version" أضف خطوة `npm install --package-lock-only --ignore-scripts`، وعدّل السطر 131 إلى:
   ```bash
   git add package.json package-lock.json public/changelog.json
   ```

2. **`.github/workflows/ci.yml`** — استبدل regex بـ:
   ```bash
   TRACKED_ENV=$(git ls-files | grep -E '(^|/)\.env(\..+)?$' | grep -v '\.example$' || true)
   ```

3. **`.husky/pre-commit`** — نفس التعديل على regex الفحص + regex الأنماط.

4. **`.husky/pre-push`** — نفس التعديل على regex الفحص.

5. **`.github/workflows/test.yml`** — استبدل خطوة "Security audit" بـ:
   ```bash
   npm audit --audit-level=high --omit=dev --json > audit-report.json || true
   HIGH=$(jq -r '.metadata.vulnerabilities.high // 0' audit-report.json)
   CRIT=$(jq -r '.metadata.vulnerabilities.critical // 0' audit-report.json)
   if [ "$((HIGH + CRIT))" -gt 0 ]; then
     echo "::error::عثر على $CRIT حرجة / $HIGH عالية"
     exit 1
   fi
   ```

### خارج النطاق (كما في الجولة السابقة)

- `git rm --cached .env` — يبقى مسؤولية المالك بعد دمج الإصلاحات (بوابات ما بعد الدمج ستمنع أي إعادة إضافة).
- ملفات المصادقة، `client.ts`, `types.ts`, `config.toml` — محمية.
- بقية ملاحظات التقرير (changelog.yml, health-check.yml, ازدواجية CI/test) — مؤجّلة لجولة تحسين لاحقة.

### معيار النجاح

```bash
grep -q "package-lock" .github/workflows/auto-version.yml
grep -q '\\.env(\\\.\\.\\+)?\\$' .github/workflows/ci.yml
grep -q '\\.env(\\\.\\.\\+)?\\$' .husky/pre-commit
grep -q '\\.env(\\\.\\.\\+)?\\$' .husky/pre-push
grep -q "jq" .github/workflows/test.yml
```
كل الأوامر ترجع 0.
