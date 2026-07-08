# نتائج التحقق + خطة إغلاق النواقص

## ✅ تم بنجاح (Patch السابق مطبَّق فعلياً)

| البند | الدليل |
|-------|--------|
| `.gitignore` يستثني `.env` | السطر 27-28 |
| CI/pre-commit/pre-push تلتقط `.env` نفسه | regex `(^\|/)\.env(\..+)?$` في الثلاثة |
| `auto-version.yml` يزامن lockfile | `Sync package-lock.json` step + `git add package-lock.json` |
| `test.yml` يستخدم jq | `jq -r '.metadata.vulnerabilities.high'` |

## 🔴 نواقص مؤكَّدة (لم تُعالج بعد)

| # | الدليل | الحالة |
|---|--------|--------|
| 1 | `git ls-files` يُظهر `.env` **ما زال متعقَّباً** | حرج |
| 2 | `health-check.yml:20` URL ثابت `nuzdeamtujezrsxbvpfi.supabase.co` | عالي |
| 3 | `test.yml` يكرر `tsc` + `eslint` + `npm audit` الموجودة في `ci.yml` | عالي |
| 4 | لا توجد سياسة تصفية دقيقة في `auto-version.yml` (يعمل على أي push) | متوسط |
| 5 | لا توثيق CSP قابل للتدقيق | متوسط |

---

## المرحلة 1 — حرجة

### 1.1 إزالة `.env` من التتبع
- الوكيل **لا يستطيع** تنفيذ `git rm --cached .env` (git stateful ممنوع).
- الإجراء اليدوي للمالك:
  ```bash
  git rm --cached .env
  git commit -m "chore(security): untrack .env"
  git push
  ```
- **تدوير مفاتيح Supabase** publishable عبر `supabase--rotate_api_keys` (يتطلب تأكيد المستخدم في build mode).
- إنشاء `docs/security/incident-2026-07-08-env-leak.md` (جدول: المشكلة/الدليل/التأثير/الإصلاح/المالك/SLA).

---

## المرحلة 2 — عالية

### 2.1 Parameterize health-check URL
- تعديل `.github/workflows/health-check.yml:20`:
  ```yaml
  URL="${{ secrets.SUPABASE_PROJECT_URL }}/functions/v1/health-check"
  ```
- إضافة حارس: إذا `SUPABASE_PROJECT_URL` فارغ → فشل مع رسالة واضحة.
- توثيق السر في `docs/diagnostics/README.md`.

### 2.2 إزالة الازدواج بين `ci.yml` و`test.yml`
- في `test.yml` حذف الخطوات:
  - `TypeScript type check` (السطر 28)
  - `ESLint check` (السطر 31)
  - `Security audit` (السطور 33-40)
- الإبقاء فقط على: `Run tests with coverage` + رفع Codecov + artifact.
- `ci.yml` يبقى المرجع الوحيد لبوابات الجودة والأمن.

---

## المرحلة 3 — متوسطة

### 3.1 تشديد `auto-version.yml`
- إضافة تصفية commits قبل الـ bump:
  - تخطي إذا كل الملفات المتغيرة ضمن: `docs/**`, `*.md`, `.github/**`, `audit/**`.
  - bump فقط عند وجود `feat:` أو `fix:` صريح منذ آخر tag.
- استخدام `git push --atomic origin main <tag>` لمنع السباق.

### 3.2 توثيق CSP
- إنشاء `docs/security/csp-policy.md` بقيمة CSP الفعلية ومكان تعريفها.
- إضافة تعليق مرجعي في أعلى `public/_headers`.

---

## خارج النطاق

- ملفات المصادقة والملفات المحمية (`config.toml`, `client.ts`, `types.ts`, `.env`).
- تنظيف تاريخ Git (BFG/filter-repo) — قرار المالك.
- بنية RLS/Edge Functions.

---

## معيار النجاح

```bash
# بعد التطبيق
grep -q "SUPABASE_PROJECT_URL" .github/workflows/health-check.yml
! grep -q "tsc --noEmit" .github/workflows/test.yml
! grep -q "eslint" .github/workflows/test.yml
! grep -q "npm audit" .github/workflows/test.yml
test -f docs/security/csp-policy.md
test -f docs/security/incident-2026-07-08-env-leak.md
# يبقى للمالك:
git ls-files | grep -x .env  # يجب أن يعود فارغاً
```
