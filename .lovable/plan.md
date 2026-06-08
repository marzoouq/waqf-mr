
## خطة التنفيذ النهائية — 3 مهام تنظيف معمارية

---

### المهمة 1 — نقل `SectionType` و `AnnualReportItem` إلى `src/types/annualReport.ts`

**السبب**: حالياً `src/pages/dashboard/AnnualReportPage.tsx` و `src/components/annual-report/*` و `src/hooks/page/admin/reports/useAnnualReportPage.ts` تستورد types من `@/hooks/data/content/useAnnualReport` — يكسر اتجاه الاعتماد (UI → hooks/data).

**التنفيذ**:
1. إنشاء `src/types/annualReport.ts` يحتوي `SectionType` و `AnnualReportItem`.
2. تعديل `src/hooks/data/content/useAnnualReport.ts`: استيراد الـtypes من `@/types/annualReport` ثم `export type { ... } from ...` للحفاظ على التوافق المؤقت.
3. تحديث 4 ملفات لتستورد مباشرة من `@/types/annualReport`:
   - `src/pages/dashboard/AnnualReportPage.tsx`
   - `src/components/annual-report/ReportItemFormDialog.tsx`
   - `src/components/annual-report/ReportSectionList.tsx`
   - `src/hooks/page/admin/reports/useAnnualReportPage.ts`
4. إزالة re-export المؤقت من `useAnnualReport.ts`.
5. `tsc --noEmit` + `vitest run src/test src/pages/dashboard/AnnualReportPage.test.tsx`.

---

### المهمة 2 — تقسيم `src/utils/financial/` إلى مجلدات فرعية

**الوضع**: 47 ملف مسطح.

**التقسيم المعتمد** (6 مجلدات):

```text
src/utils/financial/
├── computations/   # dashboardComputations, buildMonthlyData, calcChangePercent,
│                   # ratios(+test), recordConverters, multiYearHelpers(+test)
├── distribution/   # distributionCalcPure(+test), distributionSummary(+test),
│                   # myShareCalculation.test, availableAmount.test
├── fiscalYear/     # activeYearFinancials, closedYearFinancials,
│                   # findAccountByFY(+test), fiscalYearClosure.test,
│                   # accountsCalculations(+test), calculateFinancials.test
├── contracts/      # contractAllocation(+test), contractClassification(+test),
│                   # contractHelpers(+test), documentationRate(+test)
├── collection/     # collectionCompute, computeCollectionSummary.test,
│                   # computeContractualRevenue(+test), incomeCompute,
│                   # incomeAnomalies(+test), incomeFormValidation(+test),
│                   # paymentInvoicesCompute, yearComparisonHelpers(+test)
├── expenses/       # expensesCompute, expenseFormValidation(+test)
└── zatca/          # zatcaSharedLogic.test, regressionFixes.test
```

**التنفيذ**:
1. `mv` كل ملف إلى مجلده (دفعة واحدة بـ commands متوازية لكل مجلد).
2. لكل ملف منقول: `rg -l "@/utils/financial/<name>"` ثم استبدال المسار بـ `@/utils/financial/<subfolder>/<name>`.
3. **لا barrels** (التزاماً بـ `barrel-import-rule`).
4. `tsc --noEmit` + `vitest run` بعد كل دفعة (6 دفعات).
5. تشغيل `scripts/deletion-gate.mjs` كتحقق نهائي.

---

### المهمة 3 — تصليح `lookup-national-id` (الخيار المتشدّد)

**القرارات الافتراضية المعتمدة**:
- ✅ إزالة `SERVICE_ROLE_KEY` كلياً، الاعتماد على RPCs `SECURITY DEFINER` مع `GRANT EXECUTE TO anon`.
- ⏸ تأجيل CAPTCHA (لا حاجة لمزود خارجي حالياً).

**التنفيذ**:

**أ) Migration** — تحديث/إنشاء 3 دوال:
1. `lookup_by_national_id(p_national_id text)` — قراءة من `beneficiaries` + فك تشفير + إرجاع email المرتبط فقط.
2. `check_rate_limit(p_key text, p_limit int, p_window_seconds int)` — تأكيد `SECURITY DEFINER` + `GRANT EXECUTE TO anon`.
3. `log_access_event(p_event_type text, p_metadata jsonb)` — تأكيد `SECURITY DEFINER` + `GRANT EXECUTE TO anon`.
- كل الدوال: `SET search_path = public`، scope صارم للقراءة فقط، تُرجع email فقط (لا PII أخرى).

**ب) تعديل `supabase/functions/lookup-national-id/index.ts`**:
1. استبدال `serviceRoleKey` بـ `anonKey` في `createClient`.
2. إضافة **Luhn check** لرقم الهوية السعودي قبل أي استعلام (يرفض أرقاماً مزيّفة فوراً).
3. إضافة **rate limit ثانٍ per-national_id**:
   - مفتاح: `lookup_nid_target:${sha256(national_id)}` (hashed لمنع تسريب الأرقام في `rate_limits`).
   - حد: 5 محاولات / ساعة.
4. إضافة header comment يوثّق نية **pre-auth بالتصميم** ولماذا لا يصحّ استخدام `getUser()` هنا.

**ج) تحديث `mem://security/...`** — توثيق أن `lookup-national-id` و `guard-signup` و `webauthn-*` pre-auth بالتصميم؛ يجب أن يتجاهلها فحص `SERVICE_ROLE`/`getUser` مستقبلاً.

**د) التحقق**:
- `supabase test_edge_functions` (تجارب: Luhn fail/pass, rate limit IP, rate limit per-id, success path).
- `supabase curl_edge_functions` بطلب يدوي على الإصدار المنشور.

---

## ترتيب التنفيذ والتحقق

| # | المهمة | المخاطر | تحقق |
|---|--------|---------|------|
| 1 | SectionType → types/ | منخفضة | tsc + vitest |
| 2 | utils/financial subfolders | متوسطة (47 ملف) | tsc + vitest + deletion-gate |
| 3 | lookup-national-id hardening | متوسطة (DB + edge) | test_edge_functions + curl |

كل مهمة مستقلة. التنفيذ بالترتيب أعلاه (الأقل خطورة أولاً).

## القرارات الافتراضية المتّخذة

- لا barrels في `utils/financial/`.
- إزالة `SERVICE_ROLE_KEY` كلياً من `lookup-national-id`.
- تأجيل CAPTCHA.
- إبقاء `verify_jwt = false` (مقصود لـ pre-auth endpoints).

إن أردت تغيير أي من هذه القرارات أخبرني، وإلا اضغط **Implement plan** للبدء.
