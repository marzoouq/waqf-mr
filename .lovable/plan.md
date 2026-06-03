# خطة تنفيذ شاملة — البنود السبعة

## نطاق التنفيذ المُعتمَد
- **PDF**: الإفصاح السنوي للمستفيد (موجود مسبقاً — تحقق وتعزيز فقط) + تقرير سنوي مُجمَّع جديد للناظر.
- **اختبارات**: Vitest + React Testing Library فقط.
- **محاسب H-02/H-03**: مؤجّل حتى قرار المنتج (لا تغيير الآن).

---

## 1. تقرير سنوي مُجمَّع للناظر (PDF جديد)

**الحالة الراهنة:** `useAnnualReportPage.handleExportPdf` يُصدّر إنجازات/تحديات/خطط + 4 بطاقات ملخّصة فقط — بدون التفاصيل المالية الكاملة.

**الإضافة:**
- ملف جديد: `src/utils/pdf/reports/aggregatedAnnualReport.ts` — يُولّد PDF يحوي:
  - رأس الوقف + السنة المالية (هجري + ميلادي)
  - ملخص مالي كامل: إيرادات/مصروفات/ضريبة/زكاة/حصة ناظر/حصة واقف/ريع الوقف/رقبة وقف/متاح للتوزيع
  - جدول الإيرادات حسب المصدر + المصروفات حسب النوع (بدون VAT)
  - جدول المستفيدين مع نسب وأنصبة محسوبة
  - جدول التوزيعات المنفّذة (status='paid')
  - مقارنة YoY (`prev_net_after_zakat` من snapshot)
  - الإنجازات/التحديات/الخطط/حالة العقارات
- هوك جديد: `src/hooks/page/admin/dashboard/useAggregatedAnnualReport.ts` — يجمع البيانات من `useDashboardSummary` + `useAnnualReportItems` + `useDistributions` + `useBeneficiaries`
- زر جديد في `AdminDashboard.tsx`: "تقرير سنوي مُجمَّع PDF" بجوار باقي الأزرار

**مصدر البيانات:** `get_dashboard_full_summary` RPC (نفس مصدر بطاقات لوحة الناظر — يضمن تطابق الأرقام).

## 2. إصلاح H-02 لوحة المستفيد (اتساق اختيار السنة)

**الإصلاحات:**
- `useDisclosurePage.ts:123` — إضافة `distLoading` المفقود إلى `isLoading` (يعالج الـ flickering الموثّق في audit Medium).
- `useAccountsViewPage.ts:24` — استبدال `fiscalYearId ?? 'all'` بـ `isFyReady(fiscalYearId) ? fiscalYearId : 'all'` لضمان اتساق مع `useEndUserDashboardData`.
- `useDisclosurePage.ts:62` — إضافة guard: لا استدعاء `useMyDistributions` إذا `!isFyReady(fiscalYearId)` (يمنع جلب توزيعات مع id غير صالح).

## 3. تقرير تباين RPC ↔ Frontend (Variance Report)

**ملف جديد:** `src/lib/diagnostics/varianceReport.ts` — يُضاف كفحص #7 في بطاقة Card Consistency:
- `compareRpcVsHooks(fiscalYearId)` — يُشغّل RPC مباشرة + يُحاكي قيم الهوكس ويُرجع `{ field, rpcValue, hookValue, diff, severity }[]`
- التغطية: `total_income`, `total_expenses`, `vat_amount`, `zakat_amount`, `net_after_zakat`, `available_amount`, `my_share` (لمستفيد عينة), `paid_advances_total`, `carryforward_balance`
- مستوياً: السنة النشطة + جميع السنوات المقفلة
- ناتج CSV قابل للتصدير من `/dashboard/diagnostics`
- اختبار: `src/lib/diagnostics/__tests__/varianceReport.test.ts` — 6 حالات

## 4. اختبارات E2E (Vitest + RTL)

**ملفات جديدة في `src/test/e2e/`:**
- `adminDashboardFlow.test.tsx` — يُحمّل `AdminDashboard` مع QueryClient mock، يتحقق من:
  - عرض جميع البطاقات (income/expenses/net/distributions/corpus)
  - أزرار التصدير + التنقل بين السنوات
  - تطابق القيم المعروضة مع mock RPC
- `beneficiaryDashboardFlow.test.tsx` — `MyShare` → `MyDisclosure` → `MyDistributions`:
  - تحقق `Math.max(0)` على الحصة
  - زر السلفة لا يظهر إن `advance_settings.enabled=false`
  - تغيير `fiscalYearId` يُعيد تحميل الحساب الصحيح
- `accountantDashboardFlow.test.tsx` — يتحقق:
  - رابط `OverdueInvoicesCard` يوجّه إلى `/dashboard/invoices?status=overdue`
  - فلاتر overdue/pending لا تتداخل
  - بطاقات تشغيلية فقط (تأكيد سلوكي للحالة الحالية حتى قرار H-02/H-03)

**Setup:** يُستخدم `src/test/setup.ts` الموجود + `vi.mock('@/integrations/supabase/client')` لمحاكاة RPC.

## 5. فحص عددي شامل (Numerical Audit)

سكربت في `src/lib/diagnostics/checks/numericalAudit.ts`:
- يُضاف كفحص #8 في بطاقة Card Consistency
- يقارن لكل سنة (نشطة + مقفلة) قيم RPC مقابل:
  - `accounts` table (للسنوات المقفلة فقط)
  - حسابات `useEndUserFinancials` المعاد محاكاتها
  - `SUM(income)`, `SUM(expenses)`, `SUM(distributions WHERE status='paid')` المباشرة من DB
- يُولّد JSON report قابل للتصدير + يُظهر تحذيرات إن `|diff| > 0.01 ر.س`
- اختبار: `numericalAudit.test.ts` — حالة مطابقة + حالة انحراف مُتعمَّد

## 6. فحص تكامل الأزرار/التبويبات (Integrity Check)

**أداة جديدة:** `src/lib/diagnostics/checks/uiIntegrityCheck.ts` — فحص #9:
- يَستخدم AST عبر استعراض ملفات الصفحات لاكتشاف:
  - `<Link to="...">` أو `useNavigate()(...)` لمسارات غير موجودة في `App.tsx` routes
  - `<Tabs>` بدون `<TabsContent>` مطابق (يُعالج AiAssistant Medium من التدقيق السابق)
  - `<Button onClick>` بدون handler حقيقي (`() => {}` فارغ)
  - `to="#"` أو `href="#"`
- يُولّد قائمة منظّمة + يُحدّث `.lovable/audit-findings-stage3.md`

## 7. إصلاحات Medium المتبقية (من التدقيق السابق)

تطبيق سريع للملاحظات Medium التي لا تحتاج قرار منتج:
- `AiAssistant.tsx:86-97` — إضافة `<TabsContent>` المفقودة أو استبدال بـ Buttons (نختار الأخف).
- `AccountantDashboardView.tsx:57` — تصحيح "عقود بدون سنة" → "عقود بدون فواتير".
- `AccountantDashboardView.tsx:21` — استبدال `return null` بـ `<DashboardSkeleton />`.
- `MonthlyCollectionCard.tsx:31` — إضافة EmptyState بدلاً من return null الصامت.

---

## الملفات المُتأثّرة

```text
جديد (10):
  src/utils/pdf/reports/aggregatedAnnualReport.ts
  src/hooks/page/admin/dashboard/useAggregatedAnnualReport.ts
  src/lib/diagnostics/varianceReport.ts
  src/lib/diagnostics/__tests__/varianceReport.test.ts
  src/lib/diagnostics/checks/numericalAudit.ts
  src/lib/diagnostics/checks/numericalAudit.test.ts
  src/lib/diagnostics/checks/uiIntegrityCheck.ts
  src/test/e2e/adminDashboardFlow.test.tsx
  src/test/e2e/beneficiaryDashboardFlow.test.tsx
  src/test/e2e/accountantDashboardFlow.test.tsx

تعديل (8):
  src/pages/dashboard/AdminDashboard.tsx           (زر تقرير مُجمَّع)
  src/hooks/page/beneficiary/financial/useDisclosurePage.ts  (distLoading + guard)
  src/hooks/page/beneficiary/financial/useAccountsViewPage.ts (isFyReady)
  src/lib/diagnostics/checks.ts                    (تسجيل فحوصات #7/#8/#9)
  src/components/dashboard/views/AccountantDashboardView.tsx  (Skeleton + label fix)
  src/components/dashboard/accountant/MonthlyCollectionCard.tsx
  src/components/AiAssistant.tsx                   (Tabs fix)
  .lovable/audit-report-2026-06-03.md              (تحديث الحالة)
```

## ضمانات الأمان

- لا تعديل على ملفات محمية (`auth/`, `client.ts`, `types.ts`, `config.toml`, `.env`).
- لا migrations جديدة (كل التغييرات Frontend + diagnostics).
- جميع الأدوات الجديدة تعمل قراءة فقط على DB.
- اختبارات E2E تستخدم mocks — لا تلامس Live data.
- H-02/H-03 محاسب: لا تغيير حتى قرار المنتج.

## ترتيب التنفيذ

1. إصلاحات H-02 المستفيد + Medium (سريع، يفك القيود).
2. تقرير سنوي مُجمَّع PDF للناظر (الأطول).
3. أدوات التشخيص الثلاث (variance/numerical/UI integrity).
4. اختبارات E2E الثلاث.
5. تشغيل `vitest run` كاملاً للتحقق.
6. تحديث تقرير التدقيق ومذكّرة المشروع.