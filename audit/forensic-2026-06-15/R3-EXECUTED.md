# R3 — الجولة المعمارية (P2) — منجزة

تاريخ التنفيذ: 2026-06-15
المرجع: `00-FINAL-CONSOLIDATED-REPORT.md` + R1 deferred (W3-001 defense)

## الإصلاحات المُنفّذة

| # | الكود | الموقع | الإصلاح |
|---|---|---|---|
| 1 | W3-001 (تسرّب فعلي) | `src/hooks/data/contracts/useContractsForPdf.ts` | كان يُحدِّد `from('contracts')` ويختار `tenant_name` لتصدير PDF يستدعيه `useMySharePage` (مستفيد) — تحوّل إلى `contracts_safe` لإخفاء PII تلقائياً عبر طبقة العرض الآمن |
| 2 | W3-001 (دفاع متعدد الطبقات) | `eslint.config.js` | قاعدة `no-restricted-syntax` تمنع `from('contracts')` في: `hooks/data/contracts/**` (باستثناء `useContracts.ts`)، و `hooks/page/{beneficiary,waqif}/**`، و `components/{beneficiary,waqif}/**`. أي محاولة مستقبلية للوصول للجدول الخام من هذه الطبقات تكسر ESLint |

## التحقق

- ✅ ESLint نظيف على المسارات المُقيّدة (تحذير react-hooks وحيد سابق لـ R3 في `useBeneficiaryDashboardPage.ts`)
- ✅ `scripts/audit-all.mjs` أخضر: 0 Critical / 0 GAP / 4 Info
- ✅ Build TypeScript أخضر — `contracts_safe` يحتوي نفس الأعمدة المختارة

## نقاط مهمة

- **`useContracts.ts` معفى صراحةً**: لأنه يُستخدم في طبقة الناظر/المحاسب فقط (admin pages)، حيث `from('contracts')` مشروع وتتولّى RLS الحماية. أي استدعاء من بوابات المستفيد/الواقف ممنوع بـ ESLint.
- **العرض `contracts_safe`** يطبّق masking تلقائي بحسب الدور (موثّق في `docs/security/views.md` و `mem://security/views/contracts-safe-rationale`).
- **`useContractsForPdf` التحول لـ contracts_safe** يعني أن المستفيد يحصل على `tenant_name = '***'` في تصدير PDF، وهو السلوك الصحيح.

## ما لم يُنفَّذ في R3 (مؤجَّل)

- **توحيد query keys المتبقية**: 5 صفحات لا تزال تستخدم `useQuery` بمفاتيح inline. مؤجَّل لـ R6 (التوثيق + التنظيف الختامي) — لا يوجد ضرر أمني.
- **Page Hook pattern للصفحات المخالفة**: لم يُكتشف انتهاك جديد بعد إصلاحات R1/R2. القاعدة المركزية لـ ESLint (`supabase.from()` ممنوع في pages/components) لا تزال تطبَّق وهي كافية.

## بوابة القبول R3

- [x] `scripts/audit-all.mjs` أخضر
- [x] قاعدة ESLint الجديدة فعّالة ولا تكسر الـ baseline
- [x] لا يوجد استدعاء `from('contracts')` فعلي من بوابة المستفيد/الواقف
- [ ] **مطلوب من المستخدم**: تجربة تصدير PDF لحصة المستفيد والتأكد من ظهور `***` بدل اسم المستأجر

## التالي

قل **"نفّذ R4"** للجولة الأمنية على التكاملات الخارجية (vault.secrets لـ ZATCA OTP وprivate key وpii_encryption_key، استبدال FK لـ auth.users بـ profiles.id، hashing لعمود IP في access_log).
