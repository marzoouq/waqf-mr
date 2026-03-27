

## التحقق من وظائف ZATCA بعد إعادة التنظيم — المشاكل المكتشفة

### المشاكل الحالية

| # | المشكلة | الملف | التأثير |
|---|---------|-------|---------|
| 1 | `config.toml` لا يزال يحتوي على `[functions.zatca-api]` (محذوفة) ولا يحتوي على الوظائف الجديدة الثلاث | `supabase/config.toml` | ⚠️ الوظائف الجديدة قد لا تُنشر بإعدادات `verify_jwt = false` الصحيحة |
| 2 | مراجع `zatca-api` لا تزال في الوثائق (3 ملفات) | `docs/API.md`, `docs/SECURITY-KNOWLEDGE.md`, `supabase/functions/README.md` | وثائق مضللة |

### الكود الفعلي (الاستدعاءات)

استدعاءات الواجهة في `useZatcaSettings.ts` و `ZatcaManagementPage.tsx` **صحيحة** — تشير للوظائف الجديدة (`zatca-onboard`, `zatca-report`, `zatca-renew`). ✅

الملف المشترك `_shared/zatca-shared.ts` يصدّر كل الدوال المطلوبة والوظائف الثلاث تستوردها بشكل صحيح. ✅

### الإصلاحات المطلوبة

#### 1. تحديث `supabase/config.toml`
- حذف `[functions.zatca-api]`
- إضافة:
  - `[functions.zatca-onboard]` → `verify_jwt = false`
  - `[functions.zatca-report]` → `verify_jwt = false`
  - `[functions.zatca-renew]` → `verify_jwt = false`

#### 2. تحديث `docs/API.md`
- تحديث القسم 11 ليعكس التقسيم الجديد:
  - `zatca-onboard` → onboard, production, test-connection
  - `zatca-report` → report, clearance, compliance-check, compliance-buyer-qr, compliance-seller-qr
  - `zatca-renew` → renew

#### 3. تحديث `docs/SECURITY-KNOWLEDGE.md`
- استبدال سطر `zatca-api` بثلاثة أسطر للوظائف الجديدة

#### 4. تحديث `supabase/functions/README.md`
- استبدال سطر `zatca-api` بالوظائف الجديدة الثلاث

### ملاحظة
الملف المحمي `config.toml` يحتوي على إعداد `project_id` فقط كجزء محمي. تغيير إعدادات الوظائف مسموح حسب التعليمات ("you CAN add function-specific configuration blocks").

