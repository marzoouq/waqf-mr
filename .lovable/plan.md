# إكمال خطة إصلاح لوحة المستفيد

تم تنفيذ المجموعة الحرجة (N1, H2, H3, H21, N5) في الجولة السابقة وعبرت كل الاختبارات. هذه الخطة تُكمل المتوسطة الـ 14 ثم تترك الـ 16 ملاحظة لجولة لاحقة اختيارية.

---

## المرحلة 1 — اتساق Realtime (H12, H15, H17, H25, N2)

**الهدف**: توحيد اشتراكات realtime عبر كل صفحات المستفيد.

- `useDisclosurePage.ts` → إضافة `beneficiaries`, `advance_requests`, `advance_carryforward` للقائمة.
- `useAccountsViewPage.ts` (H15) → استدعاء `useDashboardRealtime` لجداول `accounts`, `distributions`.
- `useInvoicesViewPage.ts` (H17) → إضافة `useDashboardRealtime` لـ `invoices`, `payment_invoices`.
- `useExpensesViewPage.ts` (N2) → إضافة `useDashboardRealtime` لـ `expenses`.
- توحيد قائمة الجداول في ثابت `BENEFICIARY_REALTIME_TABLES` داخل `src/constants/`.

## المرحلة 2 — صحة البيانات والترتيب (H5, H16, H20, N6, N7)

- `useBeneficiaryDashboardPage.ts:53` (H5) → تغيير deps من `[isClosed, fiscalYear]` إلى `[isClosed, fiscalYear?.id]`.
- `useInvoicesViewPage.ts:66` (H16) → استخدام `new Date(a.date).getTime() - new Date(b.date).getTime()` بدل مقارنة سلاسل.
- `useInvoicesViewPage.ts` (N7) → توحيد تنسيق التاريخ عبر `toDateOnly()` من `utils/date/dateOnly`.
- `useExpensesViewPage.ts:38` (N6) → تمرير قيم افتراضية `('date', 'desc')` لـ `useTableSort`.
- `CarryforwardHistoryPage`/`useCarryforwardData` (H20) → التحقق من توافق مصدر البيانات مع باقي اللوحة (`useEndUserDashboardData`) — إذا اختلف، التبديل أو توثيق السبب.

## المرحلة 3 — تحسينات منطقية وأداء (H4, H9, H11, H14, N4, N8)

- `AccountsViewPage.tsx` (H4) → تجميع فروع `DashboardLayout` المكررة في حارس واحد early-return.
- `useMySharePage.ts:96` (H11) → استدعاء `fetchContracts()` أو إزالة الحقل غير المستخدم نهائياً.
- `useAccountsViewPage.ts:82-83` (H14) → استبدال الثوابت `10`/`5` بقيم من `useAppSettings` (`waqf_share_percentage`, `waqif_share_percentage`).
- `BeneficiaryAdvanceCard` / `MyShare AdvanceRequestDialog` (H9) → استخراج `useMaxAdvanceAmount` إلى parent أو memoization مشترك لمنع الاستدعاء المكرر.
- `useBeneficiaryDashboardPage.ts` (N4) → التحقق من توحيد queryKey مع `useNotifications` في Sidebar/BottomNav لتقاسم نفس الكاش.
- `usePropertiesViewPage.ts` (N8) → تصحيح نص الـ tooltip ليطابق دلالة `propertiesWithoutUnits` (عقارات بلا وحدات مسجّلة) بدل "غير مؤجَّرة".

## المرحلة 4 — التحقق

- `bun run test` — كامل الحزمة.
- فحص يدوي للوحة المستفيد على الراوتات: `/beneficiary`, `/beneficiary/accounts`, `/beneficiary/invoices`, `/beneficiary/expenses`, `/beneficiary/disclosure`, `/beneficiary/carryforward`.
- تحديث `audit/conventions-deep-report.md` بنتائج التنفيذ.

---

## الملفات المتأثرة (≈ 11 ملف)

```
src/hooks/page/beneficiary/dashboard/useBeneficiaryDashboardPage.ts
src/hooks/page/beneficiary/useDisclosurePage.ts
src/hooks/page/beneficiary/useAccountsViewPage.ts
src/hooks/page/beneficiary/useInvoicesViewPage.ts
src/hooks/page/beneficiary/useExpensesViewPage.ts
src/hooks/page/beneficiary/useMySharePage.ts
src/hooks/page/beneficiary/usePropertiesViewPage.ts
src/hooks/page/beneficiary/financial/useCarryforwardData.ts
src/pages/beneficiary/AccountsViewPage.tsx
src/components/beneficiary/my-share/AdvanceRequestDialog.tsx
src/constants/beneficiary*.ts (ثابت realtime جديد)
```

## خارج النطاق

- 16 بنداً صنف 🟡 (N9–N20, H6–H8, H17, H19, H22–H30): تُؤجَّل لجولة تنظيف منفصلة.
- 3 بنود مرفوضة (H1, H10, H13): لا تنفيذ.

## السؤال

هل أنفّذ المراحل الأربع جميعاً، أم مرحلة محددة فقط (مثلاً Realtime + صحة البيانات فقط = 1+2)؟
