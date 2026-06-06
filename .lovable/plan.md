# إكمال خطة لوحة المستفيد + تدقيق الربط الشامل (مُصحَّح)

## نتائج الفحص قبل التخطيط

| ادّعاء سابق | الواقع المُتحقَّق |
|---|---|
| `BeneficiaryWelcomeCard.tsx` يجب إنشاؤه (H7) | ✅ **موجود مسبقاً** (43 سطر) — يبقى التحقّق من استخدامه في `BeneficiaryDashboard.tsx` فقط |
| `RecentActivityCard.tsx` (N13) | ❌ غير موجود؛ الاسم الفعلي **`BeneficiaryRecentDistributions.tsx`** |
| `useResetPageOnFilterChange` (N17) | ❌ **غير موجود** في المشروع؛ سأُبقي `useEffect+setCurrentPage` مع تعليق توثيقي بدل إنشاء hook جديد خارج النطاق |
| `my-distributions` invalidation (H6) | ✅ مُؤكَّد في `useBeneficiaryDashboardPage.ts:86` — قابل للحذف |

---

## المرحلة 1 — الـ 10 ملاحظات 🟡 (مع التصحيحات)

| # | البند | الإجراء | الملف الفعلي |
|---|---|---|---|
| H6 | حذف `invalidateQueries(['my-distributions'])` من interval | تنظيف | `useBeneficiaryDashboardPage.ts` |
| H7 | التأكد أن `BeneficiaryWelcomeCard` مستخدَم وأي كتلة ترحيب مكرّرة محذوفة | فحص + تعديل إن لزم | `BeneficiaryDashboard.tsx` |
| H8 | إعادة تسمية `isClosed` → `isYearClosed` إن وُجد لبس | إعادة تسمية | `useBeneficiaryDashboardPage.ts` |
| N10 | تمرير `unreadCount` الكلي للـ badge بدل اشتقاقه من slice | تعديل | `useBeneficiaryDashboardPage.ts` + استخدامه |
| N11 | `aria-label` لأي أزرار أيقونية في صف الإحصاءات | a11y | `BeneficiaryStatsRow.tsx` |
| N13 | تأكيد Empty State في `BeneficiaryRecentDistributions.tsx` (بدل الاسم الخاطئ سابقاً) | فحص + إضافة EmptyState إن نقص | `BeneficiaryRecentDistributions.tsx` |
| N16 | fallback لـ `monthlyData` من income/expenses المحلية | تعديل | `useFinancialReportsPage.ts` |
| N17 | إبقاء `useEffect+setCurrentPage` مع تعليق `// reset page on filter change`  + `eslint-disable-next-line` موثَّق (لا hook جديد) | توثيق | `useContractsViewPage.ts` |
| N19 | فحص ثبات `key` في خرائط الإشعارات؛ تصحيح إن لزم | فحص + تعديل | `NotificationsPage.tsx` |
| N20 | تمرير `widgetsLoading` لمنع الوميض | تعديل | `BeneficiaryDashboard.tsx` |

أي بند يثبت أنه "محلول بالتصميم" بعد القراءة → يوثَّق في التقرير بدل التعديل.

---

## المرحلة 2 — مصفوفة ربط Guards/Hooks/States لـ 21 صفحة

أمشي على كل صفحة في `src/pages/beneficiary/` وأملأ جدول 21×9:

| العمود | المعيار |
|---|---|
| Guard | `RequirePublishedYears` بترتيب صحيح حول DashboardLayout |
| Page Hook | الصفحة logic-less؛ State من hook في `hooks/page/beneficiary/...` |
| Loading | `<DashboardLayout loading>` أو skeleton موحّد |
| Error | فرع `error` يستخدم `EmptyState` أو رسالة موحّدة |
| Empty | فرع بيانات فارغة بـ `EmptyState` |
| Unlinked | فحص `!currentBeneficiary` قبل الحساب |
| Realtime | `useDashboardRealtime` بالجداول الصحيحة |
| Buttons | كل زر مربوط بـ handler من hook (لا inline supabase) |
| Tabs | كل tab state من hook (لا `useState` يتيم في الصفحة) |

**الصفحات المغطّاة (21)**:
AccountsViewPage · AnnualReportViewPage · BeneficiaryDashboard · BeneficiaryMessagesPage · BeneficiarySettingsPage · BylawsViewPage · CarryforwardHistoryPage · ContractsViewPage · DisclosurePage · ExpensesViewPage · FinancialReportsPage · InvoicesViewPage · MySharePage · NotificationsPage · PropertiesViewPage · SupportPage · SupportPageGuard (+4 صفحات auxiliary).

**المخرجات**:
1. `audit/beneficiary-wiring-matrix.md` — جدول كامل بالحالة (✅/⚠️/❌) لكل خانة + ملاحظة موجزة.
2. إصلاحات نقطية لكل صفحة تخالف المعيار:
   - توحيد فروع Loading/Error/Empty.
   - نقل أي `useState`/handler متبقّي إلى Page Hook.
   - `aria-label` و `disabled` للأزرار حسب الحالة.
   - متوقّع ≤ 6 صفحات تحتاج تعديلاً (الأرجح: BeneficiaryMessagesPage, SupportPage, BylawsViewPage, AnnualReportViewPage).

---

## المرحلة 3 — التحقق

1. `bunx vitest run` — يجب نجاح كل الاختبارات.
2. لقطة سريعة عبر preview لـ `/beneficiary/*` للتأكد من اختفاء الوميض.
3. تحديث `audit/beneficiary-dashboard-final.md` بقسم "الجولة الختامية".

---

## الملفات المتوقّع تعديلها

```
src/hooks/page/beneficiary/dashboard/useBeneficiaryDashboardPage.ts   (H6, H8, N10, N20)
src/hooks/page/beneficiary/financial/useFinancialReportsPage.ts       (N16)
src/hooks/page/beneficiary/views/useContractsViewPage.ts              (N17 توثيق)
src/pages/beneficiary/BeneficiaryDashboard.tsx                        (H7, N20)
src/pages/beneficiary/NotificationsPage.tsx                           (N19)
src/components/beneficiary/dashboard/BeneficiaryStatsRow.tsx          (N11)
src/components/beneficiary/dashboard/BeneficiaryRecentDistributions.tsx (N13)
+ 2-6 صفحات beneficiary حسب نتيجة مصفوفة المرحلة 2
audit/beneficiary-wiring-matrix.md                                    (جديد)
audit/beneficiary-dashboard-final.md                                  (تحديث)
```

## خارج النطاق

- إنشاء hook عام `useResetPageOnFilterChange` (refactor أوسع — توثيق فقط).
- بنود H22–H30 الموثّقة سابقاً.
- إعادة هيكلة Layout كبرى أو تغييرات business logic مالية.

هل أُكمل التنفيذ؟
