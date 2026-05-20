## الهدف
خطة شاملة وصارمة تنقسم إلى مسارين متوازيين:
- **المسار A**: فحص CI قابل للتهيئة يطابق `ALLOWLIST` مع دوال DB الفعلية، مع تحكم في sync التوثيق، فلاتر الـ schema، وأنماط أسماء الدوال — قابل للضبط عبر CI inputs.
- **المسار B**: تدقيق شامل من الجذور للتطبيق (كود، أمن، أداء، لوحات الناظر/المحاسب/المستفيد) بإصلاحات مرحلية وموثّقة.

---

## المسار A — فحص Allowlist القابل للتهيئة

### A1) سكربت جديد: `scripts/security-definer-sync-check.mjs`
- يستورد `ALLOWLIST_0029` و `ALLOWLIST_ANON` من `supabase-lint-check.mjs` (بعد إعادة تصديرها).
- يقرأ Markdown من ملف التوثيق ويستخرج الدوال عبر Regex قابل للتخصيص.
- يستعلم DB:
  ```sql
  SELECT p.proname
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = ANY($1::text[])
    AND p.prosecdef = true
    AND p.proname ~ $2;
  ```
- يحسب 4 فروق ويُخرج تقريراً عربياً + JSON اختياري.

### A2) واجهة CLI/Env قابلة للتهيئة
| الخيار | Env | افتراضي | الغرض |
|---|---|---|---|
| `--check-doc` | `CHECK_DOC_SYNC` | `true` | تشغيل/تعطيل مقارنة التوثيق مع السكربت |
| `--check-db` | `CHECK_DB_SYNC` | `true` | تشغيل/تعطيل مقارنة DB ↔ Allowlist |
| `--schemas` | `DEFINER_SCHEMAS` | `public` | قائمة schemas مفصولة بفواصل |
| `--name-pattern` | `DEFINER_NAME_PATTERN` | `.*` | Regex POSIX لتصفية أسماء الدوال |
| `--exclude-pattern` | `DEFINER_EXCLUDE_PATTERN` | `^$` | استثناء أسماء (مثل cron_*) |
| `--doc-path` | `ALLOWLIST_DOC_PATH` | `docs/security/security-definer-allowlist.md` | مسار الملف |
| `--strict` | `STRICT_MODE` | `true` | فشل البناء عند أي فرق |
| `--report-json` | `REPORT_JSON_PATH` | فارغ | حفظ تقرير JSON اختياري |

### A3) تعديل `supabase-lint-check.mjs`
- `export const ALLOWLIST_0029` و `ALLOWLIST_ANON` بدلاً من `const`.

### A4) تعديل `.github/workflows/ci.yml`
- إضافة `workflow_dispatch.inputs` لكل خيار من A2 (مع defaults).
- خطوة جديدة:
  ```yaml
  - name: SECURITY DEFINER allowlist sync
    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
      CHECK_DOC_SYNC: ${{ inputs.check_doc_sync || 'true' }}
      CHECK_DB_SYNC: ${{ inputs.check_db_sync || 'true' }}
      DEFINER_SCHEMAS: ${{ inputs.definer_schemas || 'public' }}
      DEFINER_NAME_PATTERN: ${{ inputs.definer_name_pattern || '.*' }}
      DEFINER_EXCLUDE_PATTERN: ${{ inputs.definer_exclude_pattern || '^$' }}
      STRICT_MODE: ${{ inputs.strict_mode || 'true' }}
    run: node scripts/security-definer-sync-check.mjs
  ```

### A5) توثيق
- تحديث `docs/security/security-definer-allowlist.md` بقسم "فحص المزامنة" + جدول inputs.

---

## المسار B — التدقيق الشامل للتطبيق

### المرحلة B1: استكشاف وقياس خط الأساس (Discovery)
**B1.1** تشخيص أمني:
- تشغيل `supabase--linter` + `security--run_security_scan`.
- تدقيق RLS لكل الجداول الـ28 (هل كل جدول enabled + سياسات لكل عملية CRUD؟).
- تدقيق الـ32 دالة مخزّنة (DEFINER vs INVOKER، تحقق الدور الداخلي).
- تدقيق الـ11 Edge Function (وجود `getUser()`، CORS، input validation بـ Zod).

**B1.2** تشخيص الكود:
- قياس ESLint + tsc.
- بحث عن `console.log` خام (يجب استخدام `logger`).
- بحث عن hex colors خارج Canvas/SVG.
- بحث عن `localStorage` لـ fiscal_year (يجب sessionStorage).
- بحث عن `getSession()` في Edge Functions (محظور).
- بحث عن استدعاءات supabase خام في `src/pages/*` (يجب أن تكون في hooks).
- ملفات > 200 سطر (page hook violations).
- bundle size + lazy-loading coverage.

**B1.3** تشخيص الأداء:
- تحليل bundle عبر `vite build --report`.
- فحص hooks لاستعلامات N+1 (TanStack Query keys).
- فحص `staleTime`/`gcTime` المناسب لكل query.

**B1.4** تشخيص اللوحات الثلاث (الناظر، المحاسب، المستفيد):
- مطابقة `AdminDashboard.tsx`, `BeneficiaryDashboard.tsx`, واجهة المحاسب مع الـ memories:
  - Dashboard Consistency (`role-data-consistency-standard`)
  - Beneficiary Widgets (`beneficiary-dashboard-customization`)
  - Accountant Dashboard (`accountant-dashboard-filtering`)
  - Negative Value Guards (`Math.max(0)` على net shares)
  - Net Share Logic (`rawNet = myShare - advances - actualCarryforward`)
- مراجعة فلاتر "متأخر" موحّدة عبر الأدوار.
- مراجعة widgets قابلة للتخصيص من `app_settings`.

### المرحلة B2: إصلاحات أمنية حرجة
- إعادة تشغيل security scan لإسقاط false positives (S1/S2 الذي أُصلح).
- `mark_as_fixed` لـ `isServiceRole_bypass` و `invoices_bucket_broad_authenticated_read`.
- قرار موثّق على `webauthn_credentials_admin_read` (تقييد أو قبول مع `update_memory`).
- `ignore` لـ `contracts_fiscal_year_null_bypass` مع سبب.
- إصلاح أي ثغرة جديدة يكتشفها linter.

### المرحلة B3: إصلاحات الكود والمعمارية
- تقسيم أي ملف يتجاوز 200 سطر يُكتشف.
- استبدال `console.*` بـ `logger`.
- نقل أي استدعاء supabase من pages إلى `hooks/data` أو `hooks/page`.
- توحيد ألوان hex إلى CSS variables.
- إصلاح barrel imports المخالفة.

### المرحلة B4: مراجعة اللوحات الثلاث (UI + Logic)
**الناظر (admin)**:
- التحقق من KPIs الكاملة، الوصول لكل السنوات (مفتوحة/مقفلة).
- صلاحيات الإقفال/إعادة الفتح + سبب موثّق.
- مراجعة إدارة المستخدمين، الأدوار، الإعدادات.

**المحاسب (accountant)**:
- التحقق من إخفاء "ريع الوقف" حسب memory.
- التركيز على فواتير متأخرة وتحصيلات.
- لا وصول لإقفال السنة أو إدارة المستخدمين.

**المستفيد (beneficiary)**:
- العزل الكامل (`beneficiaryIsolation.test.ts` يمر).
- widgets المخصّصة من `app_settings`.
- `Math.max(0)` على net share.
- إفصاح + carryforward history صحيحان.

### المرحلة B5: الأداء وحجم الحزمة
- تأكيد lazy-loading لكل الصفحات.
- تحسين queries عالية التكلفة (multi-year, dashboards).
- تأكيد `staleTime` كافٍ للبيانات الثابتة.
- التأكد من حجم الحزمة < 5MB (gate موجود في CI).

### المرحلة B6: الاختبارات والـ CI
- التأكد أن جميع الـ1686 اختبار تمر.
- إضافة اختبارات للوحات الثلاث إن نقصت.
- التأكد من خطوة المسار A تعمل في CI.
- مراجعة `npm audit` (لا high/critical).

### المرحلة B7: التوثيق وتحديث الذاكرة
- تحديث `mem://` للقرارات الجديدة (security memory، أي تغييرات معمارية).
- تحديث `docs/security/security-definer-allowlist.md`.
- تحديث `CHANGELOG.md` للإصلاحات الأمنية.

---

## ترتيب التنفيذ المقترح
1. **A1 → A5** (إنجاز سريع، يفتح gate جديد في CI).
2. **B1** كامل (تقرير خط أساس مكتوب).
3. **B2** (أمن أولاً).
4. **B3 + B4** بالتوازي حيث لا تضارب.
5. **B5 + B6**.
6. **B7** ختاماً.

## معايير القبول الصارمة
- ✅ CI أخضر بالكامل (tsc, eslint, vitest, audit, supabase-lint, allowlist-sync, build).
- ✅ كل findings الأمنية إما `fixed` أو `ignored` بسبب موثّق.
- ✅ لا ملف > 200 سطر في `src/pages` أو `src/hooks/page`.
- ✅ لا `console.*` خام، لا `localStorage` لـ fiscal_year، لا supabase خام في pages.
- ✅ اللوحات الثلاث تتطابق مع الـ memories ذات الصلة.
- ✅ `mem://index.md` و `security memory` محدّثان.

## تنفيذ تدريجي
كل مرحلة (A، B1، B2، ...) تُنفّذ في رسالة منفصلة مع تقرير مكتمل قبل الانتقال للتالية، لتسهيل المراجعة والوقف عند أي خطأ.
