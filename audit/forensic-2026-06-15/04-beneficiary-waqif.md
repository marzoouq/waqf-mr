# Wave 4 — Beneficiary & Waqif Portals + PII Isolation

**Date:** 2026-06-15 · **Mode:** Read-only · **Scope:** 20 beneficiary pages + 1 waqif page + page-hook layer + PII paths

---

## Findings (20 total · 2 🔴 / 5 🟠 / 7 🟡 / 4 🔵 / 2 ⚪)

### 🔴 W4-001 — Waqif يصل لصفحات المستفيد عبر `ALL_NON_ACCOUNTANT`
`src/routes/beneficiaryRoutes.tsx:29-43` — مجموعة `ALL_NON_ACCOUNTANT` تشمل `waqif`، فيدخل صفحات `/beneficiary/properties|contracts|invoices|expenses|accounts|settings|bylaws|financial-reports|annual-report` ويرى `UnlinkedAccountNotice` ومحتوى مخصص للمستفيد.
**الإصلاح:** افصل `WAQIF_ONLY_ROUTES`، وضيّق الصفحات الموجّهة للمستفيد إلى `['admin','beneficiary']`.

### 🔴 W4-002 — `displayName` للواقف يكشف بريد المصادقة
`src/hooks/page/waqif/useWaqifDashboardPage.ts:52` — `user?.email?.split('@')[0]` يُعرض في `WaqifWelcomeCard`.
**الإصلاح:** اقرأ `profiles.full_name` أو ارجع لـ `'الواقف'` دون كشف الإيميل.

### 🟠 W4-003 — `SupportPageGuard` لا يحجب الواقف
`src/pages/beneficiary/SupportPageGuard.tsx:21` — يعتمد فقط على الحماية المسارية (طبقة واحدة).
**الإصلاح:** أضف `role === 'waqif'` إلى `shouldRedirect` (دفاع متعدد الطبقات).

### 🟠 W4-004 — البحث بدون debounce (Invoices, Expenses)
`useInvoicesViewPage.ts:122-130`، `ExpensesViewPage.tsx:71` — كل ضغطة تعيد فلترة كاملة.
**الإصلاح:** غلّف بـ `useDebounce(250ms)`.

### 🟠 W4-005 — `tenant_name` من `contracts_safe` غير مقنّع
`useContractsViewPage.ts:73-77`، `useDisclosurePage.ts:58`، PDF في `useMySharePage.ts:96` — الذاكرة تذكر إخفاء `tax_number/iban` فقط، أما `tenant_name` فقد يظهر للمستفيد.
**الإصلاح:** تأكد أن `contracts_safe` يقنّع `tenant_name` للمستفيد، أو طبّق طبقة قناع في hook البيانات.

### 🟠 W4-006 — `activeBalance` في المرحّل بدون تنبيه "تقديري"
`useCarryforwardData.ts:34-37` — يخلط رصيد سنة مفتوحة (لحظي) مع لقطة سنة مغلقة دون شارة تمييز.
**الإصلاح:** مرّر `isClosed` وأضف شارة "تقديري" عند السنة النشطة.

### 🟠 W4-007 — تبويبات بدون مزامنة URL
`BeneficiarySettingsPage.tsx:67`، `useAnnualReportViewPage.ts:28` — `defaultValue` فقط بلا `useSearchParams`.
**الإصلاح:** اربط بـ `?tab=`.

### 🟡 W4-008 — Annual Report يجلب كل البيانات قبل التأكد من النشر
`useAnnualReportViewPage.ts:40-45` — fetches غير مشروطة بـ `isPublished`.
**الإصلاح:** `enabled: isPublished && !!safeFyId`.

### 🟡 W4-009 — محادثات بلا معرّف مرجعي (CHT-YYYYMMDD)
`useBeneficiaryMessages.ts:52-56` — `subject` نصي حر.
**الإصلاح:** أضف بادئة `CHT-YYYYMMDD-XXXX` عند الإنشاء.

### 🟡 W4-010 — `WaqifDashboard` لا يعرض حالة خطأ
الصفحة تعرض صفر/فراغ صامت عند فشل الجلب.
**الإصلاح:** اكشف `isError` من الـ hook وارسم `<ErrorState onRetry/>`.

### 🟡 W4-011 — تعديل IBAN/هاتف دون إعادة مصادقة
`useBankAccountTab.ts:24-35` — لا تأكيد كلمة مرور / WebAuthn قبل الحفظ.
**الإصلاح:** اطلب إعادة مصادقة قبل commit للحقول الحساسة.

### 🟡 W4-012 — احتمال خلط هوية المستفيد في PDF
`useDisclosurePage.ts:85,101` — `beneficiaries.find(b => b.user_id === user.id)` بدون تحقق من الفرادة.
**الإصلاح:** اطرح خطأ عند تعدد السجلات.

### 🟡 W4-013 — Pagination لا يُعاد لصفحة 1 عند تغيير السنة المالية
`useInvoicesViewPage.ts:44` — مفقود `useEffect` reset مقابل `useContractsViewPage`.
**الإصلاح:** أضف `useEffect(() => setCurrentPage(1), [fiscalYearId])`.

### 🟡 W4-014 — `NotificationsPage` بلا ErrorBoundary على مستوى المكوّن
`useNotificationsPage.ts:56-72` يجمّع بـ Date — خطأ يهدم الصفحة.
**الإصلاح:** ErrorBoundary موضعي على القائمة.

### 🔵 W4-015 — Loader غير متّسق في SupportPage
`SupportPage.tsx:57` يستخدم `Loader2` بدلاً من `TableSkeleton`.

### 🔵 W4-016 — `myShareIsEstimated` يُجلب ولا يُعرض
لا شارة "تقديري" على المبلغ في السنة النشطة.

### 🔵 W4-017 — `withPermission=false` على مسار الواقف
`waqifRoutes.tsx:12` يتجاوز `RequirePermission` دون توثيق.

### 🔵 W4-018 — لا عداد رسائل غير مقروءة لكل محادثة
البريد العام يعرض إجمالي فقط.

### ⚪ W4-019 — احتمال تداخل DashboardLayout مع RequirePublishedYears
`MySharePage.tsx:72-73` — راجع سلوك RequirePublishedYears.

### ⚪ W4-020 — `<select>` خام في AnnualReport للموبايل
استخدم مكوّن ShadCN لمواءمة نظام التصميم.

---

## نقاط القوة

1. صفر `supabase.*` مباشرة في أي صفحة/Page-hook — انضباط طبقات كامل.
2. صفر `console.*` — `logger`/`uiNotify` فقط.
3. `IdleTimeoutManager` في `DashboardLayout` يغطّي كل `/beneficiary/*` و`/waqif`.
4. كل المسارات ملفوفة بـ `RouteGuard` (ErrorBoundary مسارية).
5. PII: `national_id` مقنّع `********` مع ARIA — `useBeneficiarySettingsPage.ts:24-28`.
6. كل قراءات العقود عبر `useContractsSafeByFiscalYear` — `tax_number/iban` معزولة.
7. Realtime channels مسمّاة بدقّة (`my-share-realtime`, `disclosure-realtime`…) مع تنظيف مركزي.
8. Pagination + `TablePagination` في كل القوائم الكبيرة.
9. `safeNumber()` مطّرد، لا حساب على null.
10. عربية كاملة، RTL، Tajawal/Amiri، CSS vars فقط.

---

## مصفوفة التغطية

| Page | Page-Hook | Data Hooks | حالة |
|---|---|---|---|
| BeneficiaryDashboard | useBeneficiaryDashboardPage | useEndUserDashboardData, useDashboardRealtime | ✅ |
| MySharePage | useMySharePage | useMyDistributions, useMyShare | ⚠ W4-016 |
| DisclosurePage | useDisclosurePage | useContractsSafe, useMyDistributions | ⚠ W4-012 |
| CarryforwardHistoryPage | useCarryforwardData | useMyBeneficiaryFinance | ⚠ W4-006 |
| InvoicesViewPage | useInvoicesViewPage | useInvoicesByFiscalYear | ⚠ W4-004/013 |
| ContractsViewPage | useContractsViewPage | useContractsSafeByFiscalYear | ✅ |
| ExpensesViewPage | useExpensesViewPage | — | ⚠ W4-004 |
| AnnualReportViewPage | useAnnualReportViewPage | useAnnualReportItems | ⚠ W4-007/008 |
| BeneficiarySettingsPage | useBeneficiarySettingsPage | useBeneficiariesSafe | ⚠ W4-007/011 |
| BeneficiaryMessagesPage | useBeneficiaryMessages | useConversations, useMessages | ⚠ W4-009/018 |
| SupportPage + Guard | useSupportPage | useSupportTickets | ⚠ W4-003/015 |
| NotificationsPage | useNotificationsPage | useNotifications | ⚠ W4-014 |
| WaqifDashboard | useWaqifDashboardPage | useEndUserDashboardData | 🔴 W4-002, W4-010 |

---

## أعلى 10 نتائج

1. 🔴 W4-001 — تسرّب صلاحيات الواقف لمسارات المستفيد
2. 🔴 W4-002 — كشف بريد المصادقة كاسم عرض للواقف
3. 🟠 W4-003 — SupportPageGuard لا يحجب الواقف
4. 🟠 W4-004 — بحث بلا debounce في فواتير/مصاريف
5. 🟠 W4-005 — tenant_name قد يظهر في contracts_safe
6. 🟠 W4-006 — رصيد مرحّل تقديري بلا تنبيه
7. 🟠 W4-007 — تبويبات بلا URL
8. 🟡 W4-011 — تعديل IBAN بلا إعادة مصادقة
9. 🔵 W4-016 — myShareIsEstimated غير معروض
10. 🟡 W4-010 — WaqifDashboard بلا حالة خطأ
