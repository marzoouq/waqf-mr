# تقرير فحص جنائي مؤسسي + خطة تنفيذ

فحصتُ المستودع فعلياً عبر بوابات المشروع نفسها (audit، typecheck، الاختبارات، بوابة التكرار، ESLint، knip)، ثم فحصت قاعدة البيانات مباشرة (linter + سياسات التخزين الحقيقية في الإنتاج).

## 1. ما يعمل بشكل سليم (مُتحقَّق منه)

| الفحص | النتيجة |
|---|---|
| بوابة `audit` الكاملة (6 سكربتات) | 0 Critical، 0 GAP، 4 Info |
| فحص الأنواع `tsgo` | نجاح، صفر أخطاء |
| الاختبارات (Vitest) | 260 ملف اختبار — كلها ناجحة |
| بوابة عدم التكرار (jscpd) | 0.05% (الحد 0.4%)، 0 استنساخ طويل |
| العزل المعماري | لا استيراد `supabase` خام في `pages/**` أو `components/**`، لا انتهاك اتجاه الاعتماد |
| المسارات | 48 مساراً في 5 ملفات routes، مطابقة تماماً لـ `ROUTE_ROLES` (48) |
| الصفحات الميتة | لا يوجد — كل صفحة في `src/pages` مرتبطة بمسار |

خلاصة: الهيكلية سليمة والعزل محترم. المشاكل الحقيقية أمنية على مستوى قاعدة البيانات، وتنظيمية (تضخم barrels + كثافة واجهة).

## 2. المشاكل المكتشفة — مرتّبة بالخطورة

### حرج — سياسة تخزين مفتوحة ما زالت حيّة في الإنتاج
استعلمت `pg_policies` فعلياً: السياسة **"Authenticated users can view invoices"** لا تزال موجودة على `storage.objects` بشرط `bucket_id = 'invoices' AND auth.role() = 'authenticated'` ودور `public`. أي مستخدم مسجّل — بما فيهم المستفيد والواقف — يستطيع تنزيل **كل** ملفات فواتير المستأجرين، وهذا يتجاوز سياسات السنة المالية والملكية الأدق الموجودة على نفس الحزمة. خمس هجرات سابقة كتبت `DROP POLICY IF EXISTS` لهذه السياسة لكنها ما زالت قائمة (أُعيد إنشاؤها بعدها).

### حرج — سياسة ثانية واسعة على نفس الحزمة
**"Role-based users can view invoices"** تمنح `beneficiary` و `waqif` قراءة كل ملفات الفواتير بشرط الدور فقط، بلا ربط بـ `invoices.file_path` ولا `is_fiscal_year_accessible`. تلغي فعلياً أثر السياسة المقيّدة "Beneficiaries and waqif can view invoice files".

### مهم — تضخّم وتعارض سياسات حزمة `invoices`
سبع سياسات SELECT متداخلة على نفس الحزمة (`Admins can read invoices`, `Admin and accountant can view invoices`, `Admin and accountant can view invoice files`, `Accountants can read invoices`, ...). التداخل يجعل التحقق الأمني غير قابل للتفكير فيه ويخفي الثقوب.

### مهم — 195 تحذير من linter قاعدة البيانات
97 دالة `SECURITY DEFINER` قابلة للتنفيذ من `anon` و97 من `authenticated`. بعضها مقصود (`has_role`, `is_fiscal_year_accessible`)، لكن لا يوجد اليوم جرد يفصل المقصود عن غير المقصود.

### متوسط — صفحة التشخيص متزاحمة على الجوال
`SystemDiagnosticsPage.tsx` فيها **16 تبويباً** في شريط واحد. على العرض الحالي (411px) هذا شريط غير قابل للاستخدام فعلياً.

### متوسط — تضخّم barrels: 314 تصديراً غير مستخدم
معظمها إعادة تصدير من `index.ts` (`components/layout/index.ts`، `components/settings/index.ts`، `components/accounts/index.ts`...) لا يستوردها أحد. تكبّر الحزمة وتخالف روح قاعدة الـ barrel.

### منخفض — أدوات الجودة
- `fast-glob` مستخدمة في `src/test/ariaLabelCoverage.test.ts` لكنها غير معلَنة في `package.json`.
- `knip` بلا إعداد: يصنّف 89 ملفاً "غير مستخدم" وكلها Edge Functions وسكربتات audit تعمل فعلياً (نتائج زائفة تُفقد الأداة قيمتها).
- ESLint: خطأ واحد `prefer-const` في `src/integrations/supabase/previewAuthStorage.ts` — ملف مولَّد ومحمي، لا يُعدَّل؛ يُستثنى في إعداد ESLint. وتحذيران: `exhaustive-deps` في `useBeneficiaryDashboardPage.ts` و`only-export-components` في `ProtectedRouteHelper.tsx`.

## 3. خطة التنفيذ (مراحل مقفلة ببصمة، حسب إطار المشروع)

### المرحلة A — إغلاق ثغرة تنزيل الفواتير (أولوية قصوى)
1. هجرة تُسقط السياستين الواسعتين: `Authenticated users can view invoices` و `Role-based users can view invoices`.
2. تنظيف السياسات المتداخلة على حزمة `invoices` وتركها بأربع سياسات صريحة فقط: قراءة admin، قراءة accountant، قراءة beneficiary/waqif مربوطة بـ `invoices.file_path` + `is_fiscal_year_accessible`، وكتابة/حذف للأدوار الإدارية.
3. هجرة تحقّق (`DO $$ ... RAISE EXCEPTION`) تفشل إن عادت أي سياسة SELECT بلا شرط دور/ملكية على الحزمة — منع التكرار مستقبلاً.
4. إعادة تشغيل الفحص الأمني للتأكد من زوال النتيجة، ثم توثيق المرحلة في `audit/forensics/phases/`.

### المرحلة B — جرد دوال SECURITY DEFINER
5. استخراج قائمة الـ97 دالة وتصنيفها: مقصودة عامة / مقصودة للمصادَقين / يجب سحب `EXECUTE` منها.
6. هجرة `REVOKE EXECUTE ... FROM anon` لكل ما لا يخدم الصفحة العامة، وحفظ الجرد في `docs/security/security-definer-inventory.md` مع تحديث security memory بالمقصود منها.

### المرحلة C — إصلاح تزاحم واجهة التشخيص
7. تحويل الـ16 تبويباً إلى تجميع من مستويين: مجموعات (نظرة عامة / الأمان / الأداء / السجلات / الخريطة) وداخل كل مجموعة تبويباتها، مع `Select` أصلي على الجوال بدل شريط التبويبات — دون أي تغيير في منطق الفحوصات.
8. مراجعة الجداول الطويلة في نفس الصفحة (سجل النشاط، الحوادث) للتأكد من التزامها بحدّ الصفحات المعتمد.

### المرحلة D — تنظيف التصديرات وأدوات الجودة
9. إزالة إعادات التصدير غير المستخدمة من ملفات barrel (بدون حذف أي مكوّن فعلي).
10. إضافة `knip.json` يعرّف Edge Functions والسكربتات والاختبارات كنقاط دخول، وإعلان `fast-glob` كتبعية تطوير.
11. إصلاح تحذيري ESLint واستثناء الملفات المولَّدة، ثم إضافة `knip` كخطوة تحذيرية (غير حاجزة) في CI.

### بوابة الإقفال لكل مرحلة
لا تُقفل مرحلة إلا بعد: `npx tsgo` + `npm run build` + كل الاختبارات + `npm run audit` + `npm run quality:dup` + إعادة الفحص الأمني، مع تقرير مرحلة موقّع في `LEDGER.md`.

## تفاصيل تقنية
- الهجرات كلها في `supabase/migrations` بصيغة idempotent (`DROP POLICY IF EXISTS` ثم `CREATE POLICY`)، ولا تلمس `supabase/config.toml`.
- سياسة المستفيد/الواقف تبقى مربوطة بجدول `invoices` عبر `file_path` و `is_fiscal_year_accessible` تماشياً مع سياسة السنوات المنشورة.
- Edge Function `invoice-file-url` تبقى البوابة الوحيدة للتنزيل؛ إسقاط السياسات الواسعة يجعلها فعلياً غير قابلة للتجاوز.
- `previewAuthStorage.ts` و `types.ts` و `client.ts` و `.env` لا تُعدَّل — تُستثنى في ESLint فقط.
