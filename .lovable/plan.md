# إكمال باقي بنود لوحة المستفيد (الملاحظات + المتبقي من المتوسطة)

نُفّذ سابقاً: المجموعة الحرجة (4 بنود) + معظم المتوسطة (9 بنود: H5, H12, H14, H15, H16, H17, H25, N2, N6, N7).

**المتبقي**: 5 بنود متوسطة (H4 مكتمل جزئياً، H9, H11, H20, N4, N8) + 16 ملاحظة 🟡.

---

## المرحلة A — بنود متوسطة متبقية

### H9 — تكرار `useMaxAdvanceAmount`
التحقق: TanStack Query يُشارك الكاش تلقائياً عند تطابق queryKey. سأفتح `useMaxAdvanceAmount` وأتأكد من ثبات queryKey؛ إذا ثابت، أوثّق "محلول بالتصميم". وإلا أُضيف queryKey مستقر.

### H11 — `contracts: []` في `useMySharePage`
حذف الحقل غير المستخدم (lazy fetch موجود عبر `fetchContracts`) لتنظيف API الـ hook.

### H20 — اتساق مصدر بيانات `CarryforwardHistoryPage`
استبدال `useMyBeneficiaryFinance` بمصدر موحّد من `useEndUserDashboardData` (`my_carryforwards`, `my_advances`, `paid_advances_total`, `carryforward_balance`) لمطابقة باقي اللوحة. fallback: توثيق سبب الاختلاف إن كان مقصوداً.

### N4 — تحقق queryKey مشترك لـ `useNotifications`
قراءة `useNotifications` للتأكد من ثبات queryKey بين Dashboard/Sidebar/BottomNav. توثيق في تعليق.

### N8 — Tooltip بطاقة "العقارات بدون وحدات"
تصحيح النص في المكوّن المعني (`PropertiesSummaryCards` أو ما يماثله) ليطابق دلالة "عقارات بلا وحدات مسجّلة" بدل "غير مؤجَّرة".

---

## المرحلة B — الملاحظات 🟡 (16 بند)

### تنظيفات منطقية مؤثّرة
- **H6** — حذف إبطال `my-distributions` غير اللازم من dashboard realtime.
- **H7** — استخراج كتلة الترحيب اليدوية (سطور 44-63 في BeneficiaryDashboard) إلى `BeneficiaryWelcomeCard` لتجنّب التكرار.
- **N9** — `useDisclosurePage.handleDownloadPDF`: منع التصدير عند `!currentBeneficiary` بدل إنتاج PDF بحقل فارغ.
- **N10** — `recentNotifications` vs `unreadCount`: إصلاح عدم الاتساق — إما عرض شارة عدد غير المقروء من الـ slice، أو تمرير "هناك المزيد".
- **N12** — إضافة `useDashboardRealtime` لـ `useCarryforwardData` (جدول `advance_carryforward`, `advance_requests`).
- **N15** — `NotificationsPage.markAllAsRead`: إضافة `onError` toast.
- **N16** — `useFinancialReportsPage`: fallback لـ `monthlyData` من income/expenses المحلية عند فراغ RPC.
- **N17** — استبدال useEffect+setCurrentPage في `ContractsViewPage` بـ `useResetPageOnFilterChange` (أو إبقاء eslint-disable مع تعليق توثيقي).
- **N18** — `BeneficiaryStatsRow`: تبديل `[...arr].sort(...).find(...)` بـ `reduce` O(n).
- **N20** — تمرير `widgetsLoading` للوحة لمنع وميض الأقسام قبل تحميل الإعدادات.

### ملاحظات قبول/توثيق فقط (لا تغيير كود)
- **H8** — دلالي بحت، بلا أثر مرئي.
- **H19** — لا مشكلة فعلية.
- **H22** — مسار `/waqif` مطابق للـ redirect.
- **H23, H24, H26, H27, H28, H29, H30** — إما توثيق أو تأجيل لإعادة هيكلة أوسع.
- **N11, N13, N14, N19** — لا تغيير مطلوب.

سأكتفي بتنفيذ ما له أثر فعلي (10 من 16) وأُلحق ملاحظة موجزة في تقرير الفحص للباقي.

---

## المرحلة C — التحقق وتوثيق

1. تشغيل `bunx vitest run` كاملاً.
2. تحديث `audit/conventions-deep-report.md`:
   - جدول الحالة النهائية لكل البنود H1–H30 و N1–N20.
   - وسم البنود المنفّذة/المؤجّلة/المرفوضة.

---

## الملفات المتوقّع تعديلها (≈ 12)

```
src/hooks/page/beneficiary/financial/useMySharePage.ts          (H11)
src/hooks/page/beneficiary/financial/useCarryforwardData.ts     (H20, N12)
src/hooks/page/beneficiary/financial/useDisclosurePage.ts       (N9)
src/hooks/page/beneficiary/financial/useFinancialReportsPage.ts (N16)
src/hooks/page/beneficiary/dashboard/useBeneficiaryDashboardPage.ts (H6, N10)
src/hooks/page/beneficiary/notifications/useNotificationsPage.ts (N15)
src/hooks/page/beneficiary/views/useContractsViewPage.ts        (N17)
src/pages/beneficiary/BeneficiaryDashboard.tsx                  (H7, N20)
src/components/beneficiary/dashboard/BeneficiaryWelcomeCard.tsx (H7)
src/components/beneficiary/dashboard/BeneficiaryStatsRow.tsx    (N18)
src/components/properties/PropertiesSummaryCards.tsx*           (N8)
audit/conventions-deep-report.md                                (تقرير ختامي)
```
*المسار التقريبي — سأتحقّق قبل التعديل.

## خارج النطاق

- البنود الـ 6 المُصنّفة "ملاحظة بلا أثر" — توثيق فقط في التقرير الختامي.
- H4 المكتمل سابقاً — لا تغيير إضافي.

هل أُكمل التنفيذ الآن؟
