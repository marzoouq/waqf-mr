# R1 — الجولة الحرجة (P0) — منجزة

تاريخ التنفيذ: 2026-06-15
المرجع: `00-FINAL-CONSOLIDATED-REPORT.md` + `07-integration-e2e.md`

## الإصلاحات المُنفّذة

| # | الكود | الموقع | الإصلاح |
|---|---|---|---|
| 1 | W7-025/003 | `src/hooks/data/invoices/usePaymentInvoices.ts` | `.limit(1000)` → `PER_FY_LIMIT (2000)` لمنع الاقتطاع الصامت للفواتير |
| 2 | W7-008/021 | `src/hooks/data/financial/fiscalYears/useCloseFiscalYear.ts` | تصحيح `'dashboard_summary'` → `'dashboard-summary'` (kebab-case) + إضافة `'aggregated-distributions'` لقائمة الإبطال |
| 3 | W5-001 | `supabase/functions/_shared/zatca-fetch.ts` (جديد) + ZATCA-onboard/report/renew | 8 استدعاءات `fetch` ملفوفة بـ `AbortController` (timeout 15s) + retry exponential (3 محاولات: 0/500/1500ms). لا retry على 4xx. |
| 4 | W6-001 | migration → `DROP FUNCTION jwt_role()` | الدالة لم تعد مستخدمة في أي policy حية (تم التحقق عبر `pg_policy` — 0 نتائج)، الحذف يمنع الانحراف المستقبلي. القاعدة المركزية تنص على استخدام `has_role()` حصراً. |
| 5 | W7-006 | migration → `create_contract_with_invoices(jsonb)` + `useCreateContractWithInvoices` + `useContractFormSubmit` | إنشاء العقد + توليد فواتيره في معاملة PostgreSQL ذرّية واحدة. الفشل في توليد الفواتير يستدعي rollback تلقائي — لا عقود يتيمة بعد اليوم. مُطبّق على المسار المفرد والمتعدد. |

## نتائج التحقق

- ✅ Build PASS (لا أخطاء TypeScript)
- ✅ Migration نجح بدون warnings جديدة منسوبة للإصلاح
- ✅ Linter الـ 42 تحذيراً السابقة: ERROR الوحيد على `contracts_safe` (موثّق ومقصود) + WARN على دوال SECURITY DEFINER قائمة مسبقاً (ليست من R1)
- ✅ الـ RPC الجديدة تستخدم `REVOKE FROM PUBLIC` + GRANT صريح لـ `authenticated` و `service_role` فقط

## ملاحظات ما لم يُنفَّذ في R1

- **W3-001 (contracts_safe enforcement)**: البنية موجودة (`useContractsSafeByFiscalYear` + view + RLS على الجدول الأصلي). الناقص فقط طبقة دفاع إضافية = ESLint rule يمنع `from('contracts')` خارج طبقة admin. مؤجَّل لـ R3 (المعمارية) حيث ستُجمَع كل قواعد ESLint الجديدة.
- **W6-002 (docs + regression tests)**: اختبار `src/test/contractsSafeAccess.test.ts` موجود فعلاً. توثيق `docs/security/views.md` موجود. الباقي اختبار regression لـ `create_contract_with_invoices` نفسه — يُكتب في R6.

## بوابة القبول R1

- [x] Build TypeScript أخضر
- [x] Migration مُطبَّق دون انحدار
- [x] `jwt_role()` غير موجود في DB (`SELECT … FROM pg_proc WHERE proname='jwt_role'` يجب أن يُرجع 0)
- [ ] **مطلوب من المستخدم**: تجربة إنشاء عقد جديد من الواجهة والتأكد من ظهور الفواتير فوراً
- [ ] **مطلوب من المستخدم**: تجربة إقفال سنة مالية والتأكد من تحديث لوحة الناظر فوراً

## التالي

قل **"نفّذ R2"** للجولة المالية (advance status RPC، annual report publish، compound indexes للأداء، عزل PII للمستفيد/الواقف).
