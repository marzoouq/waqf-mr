# خطة Stage 4 — تفعيل البطاقات + الفحص الشامل + E2E

## القرار المعتمد
- بطاقات المحاسب H-02/H-03 → **feature flag** يتحكم بها الناظر عبر `app_settings.accountant_financial_cards` (افتراضي: false)
- صلاحيات الوصول: `has_role(auth.uid(),'accountant')` + قراءة العَلَم

---

## 1) Feature Flag لبطاقات المحاسب H-02/H-03

**Migration:** إضافة سجل في `app_settings`:
```sql
INSERT INTO app_settings(key,value) VALUES ('accountant_financial_cards','false')
ON CONFLICT (key) DO NOTHING;
```

**كود:**
- `src/hooks/data/settings/useAccountantCardsFlag.ts` — هوك قراءة العَلَم (مع cache)
- `src/components/dashboard/views/accountant/TotalIncomeCard.tsx` — H-02 (إجمالي الإيرادات، نفس مصدر بيانات الناظر `get_dashboard_full_summary`)
- `src/components/dashboard/views/accountant/AvailableNetCard.tsx` — H-03 (صافي الريع المتاح)
- تحديث `AccountantDashboardView.tsx`: عرض البطاقتين فقط إذا `flag===true && hasRole('accountant')`
- إضافة Toggle في `src/pages/admin/settings/` لتحكم الناظر

---

## 2) إصلاح H-02 لوحة المستفيد (تأكيد)
- التأكد أن `useDisclosurePage` + `useAccountsViewPage` يعيدان حساب البيانات عند تغيير `fiscal_year_id` من sessionStorage
- إضافة `queryKey` يحوي `fyId` صراحةً في كل هوك بيانات يستهلكه (مراجعة `useMyShare`, `useMyDistributions`, `useDisclosureData`)
- اختبار يدوي + اختبار وحدة يثبت تبدّل القيم عند تغيير السنة

---

## 3) تقرير التباين RPC ↔ UI
**ملف جديد:** `src/lib/diagnostics/varianceReport.ts`
- يستدعي `get_dashboard_full_summary(fy)` لكل سنة (نشطة + مقفلة)
- يقارن مع نتائج الهوكس: `useFinancialOverview`, `useMyShare`, `useDistributionsSummary`, `useOverdueInvoices`, `useAccountantMetrics`
- الحقول المقارَنة: `total_income, vat_amount, zakat_amount, admin_share, waqif_share, net_after_zakat, available_amount, distributions_total, my_share, paid_advances, carryforward`
- العتبة: فرق > 0.01 SAR = انحراف
- المخرج: مصفوفة `VarianceRow{ card, field, rpc, ui, diff, fyLabel, status, suspectedSource }`

**صفحة عرض:** `src/pages/admin/diagnostics/VarianceReportPage.tsx` (مرئية للناظر فقط) + زر تصدير CSV/JSON

---

## 4) الفحص العددي الشامل
**ملف:** `src/lib/diagnostics/numericalAudit.ts`
- لكل سنة مالية: استخراج قيم RPC + DB raw aggregates (`SUM(income.amount)`, `SUM(expenses.amount)`, إلخ) + قيم الواجهة
- توليد جدول ثلاثي العمود: DB / RPC / UI لكل بطاقة في 3 لوحات
- اختبار `numericalAudit.test.ts` يفشل إذا وجد انحراف غير مبرّر

---

## 5) فحص تكامل الواجهة (Buttons/Tabs/Routes)
**ملف:** `src/lib/diagnostics/uiIntegrityCheck.ts`
- مسح AST لـ `src/pages/dashboard/**` و `src/components/dashboard/**`
- يرصد: `to="#"`, `onClick={() => {}}` فارغة, `<Tabs>` بلا `<TabsContent>` مطابق, روابط لمسارات غير موجودة في `App.tsx`, أزرار بدون `aria-label`
- تقرير: `.lovable/ui-integrity-report.md`
- اختبار يفشل إذا ظهرت مشاكل جديدة

---

## 6) اختبارات E2E (Vitest + RTL)
ملفات في `src/test/e2e/`:
- `adminDashboardFlow.test.tsx` — تسجيل دخول admin → تنقّل بين تبويبات + تبديل سنة + التحقق من قيم البطاقات
- `beneficiaryDashboardFlow.test.tsx` — مستفيد يفتح الإفصاح + الحسابات + تبديل سنة
- `accountantDashboardFlow.test.tsx` — محاسب يرى التحصيل/المتأخرات، ولا يرى H-02/H-03 إلا عند تفعيل العَلَم
- جميعها mocks لـ `supabase` (لا بيانات حقيقية)

---

## 7) ربط بمتطلبات Stage 3
- تحديث `.lovable/audit-report-2026-06-03.md` بنتائج الفحص العددي + التباين
- تحديث `.lovable/plan.md` بإغلاق بنود H-02/H-03/Stage 3

---

## ملفات متأثرة
**جديدة (10):** `useAccountantCardsFlag.ts`, `TotalIncomeCard.tsx`, `AvailableNetCard.tsx`, `varianceReport.ts` + test, `VarianceReportPage.tsx`, `numericalAudit.ts` + test, `uiIntegrityCheck.ts` + test, 3× E2E tests
**معدّلة (5):** `AccountantDashboardView.tsx`, إعدادات الناظر, `App.tsx` (route التقرير), `useMyShare/useMyDistributions` (queryKey), `.lovable/plan.md`
**Migration (1):** seed مفتاح `accountant_financial_cards` في `app_settings`

**ملاحظات:**
- لا تغيير على أي ملف محمي
- لا تعديل RLS — العَلَم في `app_settings` المحمي أصلاً
- لا بيانات حقيقية في الاختبارات
