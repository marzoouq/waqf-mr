# خطة فحص تنظيمي شامل للمستودع

## السياق

المستودع ضخم وناضج: **1201 ملف TS/TSX**، 39 صفحة (`pages/dashboard` + `pages/beneficiary` + `waqif`)، 35 مجموعة مكوّنات، 6 طبقات هوكات (`application/auth/data/domain/page/ui`)، 17 مجلد `utils/*` تخصصي، 14 مجلد `lib/*`، 21 Edge Function، 7 سكربتات حراسة، 42 جدول قاعدة بيانات، و 40+ ملف اختبار حماية.

الفحوصات الموجودة (`audit-ui-permissions`, `audit-page-controls`, `build-permissions-matrix`, `security-gates`, `check-conventions`, `supabase-lint-check`, `security-definer-sync-check`) تغطي **الصلاحيات والأمن** — لكن لا يوجد فحص شامل **للتنظيم الهيكلي** يطابق قواعد الذاكرة (Core Modularization v7، Hooks Layering، lib vs utils، Barrel Rule، Container/Presentational).

## النطاق (قراءة فقط)

لا تعديلات، لا migrations، لا ملفات محمية. المخرج تقارير Markdown + CSV في `audit/` فقط.

## خطة التنفيذ — 6 مراحل

### المرحلة 1 — خط الأساس الآلي (متوازي)

تشغيل كل الفحوصات الحالية لتأكيد عدم وجود انحدار قبل البدء:
- `npm test` + `npm run lint` + `npm run lint:conventions` + `npm run typecheck`
- `node scripts/audit-ui-permissions.mjs` + `audit-page-controls.mjs` + `build-permissions-matrix.mjs` + `security-gates.mjs` + `supabase-lint-check.mjs` + `security-definer-sync-check.mjs`

كلها يجب أن تبقى خضراء.

### المرحلة 2 — جرد هيكلي شامل

سكربت قراءة جديد `scripts/audit-structure.mjs` يولّد `audit/structure-inventory.csv` يحوي لكل ملف TS/TSX:
- `path`, `layer` (page/component/hook-data/hook-domain/hook-page/hook-application/hook-auth/hook-ui/lib/util/route/type/test/integration)
- `loc` (عدد الأسطر)
- `imports_count`, `exports_count`
- `barrel` (هل هو `index.ts` يعيد التصدير فقط؟)
- `has_supabase_import`, `has_toast_import`, `has_console_log`
- `default_export` (true/false)

### المرحلة 3 — فحص امتثال القواعد المعمارية

سكربت `scripts/audit-conventions-deep.mjs` يفحص ضد قواعد الذاكرة:

| القاعدة | الفحص | الحد المسموح |
|---|---|---|
| Core Modularization v7 | صفحة `pages/**` تستورد فقط من `hooks/page/`، `components/`، `lib/`، `types/` — لا تستورد `supabase` مباشرة ولا `hooks/data/*` | 0 انتهاك |
| Hooks Layering | `hooks/data/**` لا تستورد `sonner`؛ `hooks/domain/**` لا تستورد `supabase` مباشرة؛ `hooks/page/**` لا تحوي `await supabase.from` خارج wrappers | 0 |
| lib vs utils | `utils/**` لا تستورد `sonner` ولا `@/integrations/supabase`؛ ولا تستورد من `@/hooks/data/*` | 0 |
| Barrel Rule | لا `index.ts` يستورد من `index.ts` آخر | 0 |
| Container vs Presentational | ملفات `components/**/*.tsx` ≤ 200 سطر؛ ملفات `hooks/**/*.ts` ≤ 200 سطر؛ Props ≥ 5 يجب تجميعها | تقرير + تحذيرات |
| No Toast in Data Hooks | `hooks/data/**` بدون `from 'sonner'` ولا `uiNotify` | 0 |
| Page Hook Pattern | صفحات `pages/**` بدون `useState/useEffect` لمنطق أعمال (heuristic: `useState` count > 3) | تحذير |
| logger usage | لا `console.log/warn/error` خارج `src/lib/logger.ts` و `scripts/` | 0 |
| Hex colors | لا `#[0-9a-f]{3,8}` في `.tsx` (ما عدا Canvas/SVG/PDF) | 0 |

المخرج: `audit/conventions-deep-report.md` + `audit/conventions-deep-violations.csv`.

### المرحلة 4 — فحص الصفحات والتبويبات

موسّع للسكربت الحالي `audit-page-controls.mjs`:
- لكل صفحة: اسم، مسار، أدوار، عدد التبويبات، عدد الأزرار، عدد المكوّنات الفرعية، عدد الأسطر، الهوك الرئيسي
- تأكيد كل صفحة لها سطر في `audit/ui-permissions-matrix.csv`
- تأكيد كل تبويب يستخدم `TabsTrigger` ضمن `Tabs` مع `value` متطابق
- كشف أي صفحة بدون `hooks/page/` مقابل (انتهاك Page Hook Pattern)

المخرج: تحديث `audit/page-controls-audit.md` بقسم جديد "Page → Hook binding".

### المرحلة 5 — فحص الهوكات والتقسيم الفرعي

`scripts/audit-hooks-layout.mjs`:
- `hooks/auth/` يطابق `session/role/biometric/flows` (Hooks Auth Subfolder Layout)
- `hooks/data/financial/` و `hooks/data/settings/` مقسّمة لمجلدات موضوعية (Hooks Data Subfolder Layout)
- لا استيراد من barrel `hooks/auth/index.ts` (يجب direct imports)
- كل hook له اسم يبدأ بـ `use`
- لا hook يستورد من `pages/**` (انتهاك اتجاه الاعتماد)

المخرج: `audit/hooks-layout-report.md`.

### المرحلة 6 — تقرير نهائي موحّد

ملف واحد `audit/structure-deep-review.md` يحوي:

1. **ملخص تنفيذي** — درجة الصحة الإجمالية (✅/⚠/🔴) لكل قاعدة.
2. **إحصاءات** — جدول: عدد الملفات لكل طبقة، متوسط LOC، أكبر 10 ملفات، الملفات > 200 سطر.
3. **الانتهاكات** — مصنّفة حسب الخطورة (Critical/Warning/Info) مع `file:line` و القاعدة المخروقة و الذاكرة المرجعية (`mem://...`).
4. **التوزيع الصحي** — هل المجلدات منظمة موضوعياً؟ أي مجلد منتفخ (> 50 ملف) يحتاج تقسيم؟
5. **Edge Functions** — جرد سريع (21 وظيفة) + تأكيد وجود `_shared`, Zod validation, `getUser()` (مرجعية فقط — لا فحص جديد).
6. **توصيات** — قائمة مرتبة بالأولوية للجولات اللاحقة (إصلاح مستقل بموافقة).

## الاستبعادات الصريحة

- لا تعديل أي ملف مصدر، migration، RLS، أو ملف محمي (`config.toml`, `client.ts`, `types.ts`, `.env`).
- لا تحريك ملفات أو إعادة هيكلة في هذه الجولة.
- لا إصلاح الانتهاكات المكتشفة — تُسرد فقط كبنود عمل تنتظر موافقة منفصلة.
- لا تغيير في `CONTRIBUTING.md` أو ملفات الذاكرة.

## معايير القبول

- 4 سكربتات فحص جديدة في `scripts/audit-*` (قراءة فقط).
- 5 مخرجات في `audit/`: `structure-inventory.csv`, `conventions-deep-report.md`, `conventions-deep-violations.csv`, `hooks-layout-report.md`, `structure-deep-review.md`.
- جميع فحوصات CI الموجودة تبقى خضراء.
- التقرير النهائي ≤ 1000 سطر، يحدد بوضوح ما هو سليم وما يحتاج تدخل لاحق.

## تفاصيل تقنية

- اللغة: Node ESM (متناسق مع باقي `scripts/*.mjs`).
- بدون اعتمادات جديدة — regex + AST خفيف بـ `node:fs` فقط (نفس نمط السكربتات الحالية).
- وقت التنفيذ المتوقع: ≤ 30 ثانية لكل سكربت على 1201 ملف.
