# تقرير فحص جنائي شامل — لوحة الناظر / المحاسب / المستفيد

> فحص مقارن بين الكود الفعلي (`src/pages`, `src/hooks/page`, `src/hooks/data`, `src/routes`, RLS) والوثائق (`docs/FINAL-AUDIT-REPORT.md`, `docs/ADMIN-PAGES.md`, `docs/BENEFICIARY-PAGES.md`, `mem://`).

## 1) النتائج العامة (ما هو سليم فعلاً)

- **الالتزام المعماري ممتاز**: لا توجد `console.*` خام، لا `localStorage` لأشياء حسّاسة، لا استدعاءات `supabase.from(...)` خام في `src/pages` أو `src/components` — كل شيء يمر عبر `hooks/data` أو `hooks/page` (Core Modularization v7).
- **التوجيه والصلاحيات مرتب**: `adminRoutes.tsx` يفصل بدقة بين `ADMIN_ROLES` (ناظر+محاسب) و`ADMIN_ONLY` (مستخدمون، إعدادات، ZATCA، تشخيص، email-monitor) — مطابق لـ DOC.
- **RLS قوي**: كل الجداول المالية الحساسة عليها سياسة RESTRICTIVE عبر `is_fiscal_year_accessible`، و`audit_log` عليه `USING(false)` للتعديل والحذف — مطابق لتقرير v3.0.
- **لوحة المحاسب** مفعّلة عبر `AccountantDashboardView` داخل نفس `AdminDashboard` (مشروط `ctx.isAccountant`) — متناسق مع تصميم النظام (دور مستهلك لنفس الصفحة بفلترة).
- **لوحة المستفيد** تستخدم `useBeneficiaryWidgets` للتحكم في الإظهار، و`RequirePublishedYears` لحجب البيانات من السنوات غير المنشورة — مطابق لذاكرة "Public Stats Control" و"Closed Year Override".
- اختبارات التعاقد (`pageHookBindingContract`, `surfaceComponentIsolation`, `dashboardRoutesContract`, `invoicesExpensesDecoupling`, `incomeExpensesHookPathsContract`) تحرس البنية فعلياً.

## 2) المشاكل المكتشفة الفعلية (جديدة ولم تُغطَّ في docs/FINAL-AUDIT-REPORT)

### 🔴 حرجة / متوسطة

| # | الموقع | المشكلة | الأثر |
|---|--------|---------|-------|
| F-A1 | `src/hooks/data/core/usePrefetchPages.ts` (السطر 40–50) | يُسجّل في الكاش تحت `queryKey: ['beneficiaries']` بيانات قادمة من `beneficiaries_safe` بأعمدة محدودة، بينما `useBeneficiaries` (CRUD factory في `useBeneficiaries.ts`) يستخدم نفس مفتاح `'beneficiaries'` لجلب صف كامل من جدول `beneficiaries` الحقيقي عبر العقد. **تصادم مفاتيح** ينتج بيانات منقوصة أو مختلفة المصدر للناظر/المحاسب بعد أي prefetch. | بيانات ناقصة في صفحة المستفيدين بعد أول Prefetch، حتى تنتهي صلاحية `staleTime`. |
| F-A2 | `src/hooks/data/notifications/useNotificationBeneficiaries.ts` و`src/hooks/data/messaging/useBulkMessaging.ts` | استعلام مباشر من `beneficiaries` (جدول PII)، رغم أن `_safe` متاح. الأعمدة المختارة (`id, name, user_id`) آمنة، لكنه يكسر قاعدة "Use beneficiaries_safe everywhere outside admin CRUD" المذكورة في `FINAL-AUDIT-REPORT` (CRIT-PII-1). | مخاطرة انحدار مستقبلية: أي توسيع للـ select سيُسرّب PII دون كاشف. |
| F-A3 | `src/hooks/data/notifications/useNotificationBeneficiaries.ts` | `queryKey: ['beneficiaries', 'all']` يتداخل أيضاً مع invalidation الكلي على `['beneficiaries']` (الكلمات تبدأ بنفس البادئة في TanStack Query)، مع F-A1 يؤدي إلى invalidations زائدة. | أداء: استعلامات إعادة التحميل عند كل CRUD مستفيد. |
| F-B1 | `BeneficiaryDashboard.tsx` (السطر 37) | شرط "حسابك غير مرتبط" يعتمد على `!currentBeneficiary && !dashLoading`. لكن `useBeneficiaryDashboardPage` يجلب بيانات تعتمد على وجود مستفيد قبل التحقق منه (`dashError` فقط أعلاه). إذا كان الدور `waqif` (لا يملك سجل مستفيد إطلاقاً)، يُعرض له "حسابك غير مرتبط" بدلاً من تجربة الواقف. | تجربة سيئة للواقف عند زيارة `/beneficiary` (لا توجد حماية مسار صريحة بدور `waqif` في `BENEFICIARY_ROLES = ['admin','beneficiary']` — جيد، لكن إن وصل عبر أي قناة يرى رسالة خاطئة). تحقق مزدوج مطلوب. |
| F-C1 | `AdminDashboard.tsx` السطر 134 (`PagePerformanceCard`) محصور بـ `role === 'admin'`، لكن `ChartOfAccountsPage` و`HistoricalComparisonPage` و`AnnualReportPage` و`Bylaws`/`AuditLog` في `adminRoutes` مفتوحة لـ `ADMIN_ROLES` (يشمل المحاسب). الذاكرة `accountant-dashboard-filtering` تقول "Restricts Waqf Revenue views" — لكن **شجرة الحسابات** و**التقرير السنوي** و**النظام الأساسي** لم تُذكر في `ACCOUNTANT_EXCLUDED_ROUTES` المرجَّعة في docs (الجولة 21 ذكرت `diagnostics` فقط). | فجوة سياسة: غير واضح هل يجب أن يرى المحاسب التقرير السنوي/شجرة الحسابات/التشخيص؟ يجب توثيق القرار صراحة. |
| F-C2 | `useAccountantDashboardData.ts` (`isAccountant`) | المحاسب يرى نفس KPIs المالية الكاملة (`adminShare`, `waqifShare`, `waqfRevenue`) عبر `DashboardStatsGrid` لأن الشرط `ctx.isAccountant && <AccountantDashboardView ...>` هو **إضافة** لا **استبدال**. ذاكرة "Accountant Dashboard" تقول صراحة: "Restricts Waqf Revenue views، focuses on overdue invoices and collections". | تناقض بين الذاكرة والكود: المحاسب يرى ريع الوقف رغم القاعدة. |

### 🟡 ملاحظات وتحسينات

| # | الموقع | الملاحظة |
|---|--------|----------|
| N-1 | `IncomePage.test.tsx`, `ExpensesPage.test.tsx` | تم تحديثها مؤخراً، لكن لا يوجد **اختبار تكامل** يضمن أن CRUD يعكس قاعدة البيانات الحقيقية لـ `accounts`, `distributions`, `payment_invoices` — التغطية تقتصر على income/expenses (`incomeExpensesCrudReflection.test.tsx`). |
| N-2 | `AccountsPage` | الوثيقة تذكر `useTenantPayments` لكن لا يوجد ملف بهذا الاسم في `src/hooks/data` (تم تجميعه ضمن `usePaymentInvoices`). تحديث `docs/ADMIN-PAGES.md` مطلوب. |
| N-3 | `docs/FINAL-AUDIT-REPORT.md` | يدّعي 100% / 10 من 10 وتاريخ 2026-03-22، لكن مشاكل F-A1..F-C2 أعلاه لم تُذكر — التقرير قديم وغير شامل. |
| N-4 | `BeneficiaryDashboard` | بطاقة `BeneficiaryAdvanceCard` مشروطة بـ `advanceEnabled && role !== 'waqif'` — جيد، لكن `currentBeneficiary` المطلوب لإنشاء طلب سُلفة قد يكون `null` وتظهر البطاقة فجأة مع `isFyReady`. الشرط الحالي يحمي، لكن لا يوجد اختبار يحرس هذا. |
| N-5 | `BENEFICIARY_ROLES` يضم `admin` (لزيارة الصفحات للمعاينة). يجب توثيق أن أي طلب سُلفة من ناظر-بصفته-مستفيد قد يُرفض من RLS لأن `beneficiary_id IN (SELECT FROM beneficiaries WHERE user_id = auth.uid())` — لا مشكلة أمنية، لكن تجربة الناظر "كمعاين" مكسورة. |
| N-6 | `EmailMonitorPage`, `SystemDiagnosticsPage` في `adminRoutes` لكن ليست في `docs/ADMIN-PAGES.md` (4 صفحات فقط موثقة من أصل 20+). فجوة توثيق ضخمة. |
| N-7 | لا يوجد ملف `mem://conventions/...` لقرار "هل ريع الوقف يُحجب عن المحاسب" — الذاكرة موجودة لكن الكود يخالفها (F-C2). |
| N-8 | الواجهة على viewport 384×615: لم أتحقق بصرياً من تجاوب `DashboardStatsGrid` و`AccountantDashboardView` في الموبايل، يُنصح بفحص بصري مع `preview_ui--set_preview_device_viewport`. |

## 3) ما طابق التوثيق فعلاً

- التسلسل المالي في `useFinancialSummary` (إيرادات+مرحّل → −مصروفات → −VAT → −زكاة → −حصص → −رقبة = متاح) مطابق لمخطط `docs/BENEFICIARY-PAGES.md`.
- `execute_distribution` RPC ذرّي، الحساب server-side (ذاكرة "Server-Side Distribution").
- `is_fiscal_year_accessible` يحجب السنوات غير المنشورة عن المستفيد/الواقف (مطابق RLS).
- توزيع الحصص بـ Largest Remainder، 6 خانات عشرية (ذاكرة "Largest Remainder Method").

## 4) التوصيات (مرتبة بالأولوية)

### أولوية عاجلة (P0)
1. **إصلاح F-A1 (تصادم cache key)**: إما تغيير prefetch إلى `queryKey: ['beneficiaries-safe']` ليطابق `useBeneficiariesSafe` (السطر 77 من `useBeneficiaries.ts`)، أو إزالة Prefetch لأن قائمة المستفيدين خفيفة.
2. **حسم F-C2**: قرار صريح — إما (أ) إخفاء `adminShare/waqifShare/waqfRevenue` من `DashboardStatsGrid` للمحاسب وفق الذاكرة، أو (ب) تعديل الذاكرة لتقول "المحاسب يرى الكل". الكود والذاكرة لا يجب أن يتعارضا.

### أولوية عالية (P1)
3. **F-A2**: تحويل `useNotificationBeneficiaries` و`useBeneficiariesForMessaging` إلى `beneficiaries_safe` (نفس الأعمدة متوفرة)، وإضافة قاعدة ESLint تمنع `from('beneficiaries')` خارج `useBeneficiaries.ts`.
4. **F-B1**: إضافة فرع صريح في `BeneficiaryDashboard`: `if (role === 'waqif') return <WaqifBeneficiaryView />` بدل عرض "حسابك غير مرتبط".
5. **توحيد `ACCOUNTANT_EXCLUDED_ROUTES`**: مراجعة كل صفحة في `adminRoutes` ذات حساسية مالية واستبعادها بشكل صريح (chart-of-accounts، annual-report، إلخ) أو السماح صراحة، وتوثيقها.

### أولوية متوسطة (P2)
6. **اختبارات تكامل CRUD** للجداول الباقية (`accounts`, `distributions`, `expense_budgets`, `payment_invoices`) على نمط `incomeExpensesCrudReflection.test.tsx`.
7. **تحديث `docs/ADMIN-PAGES.md` و`docs/BENEFICIARY-PAGES.md`**: توثيق كل 20+ صفحة (حالياً 4 فقط)، وحذف ذكر `useTenantPayments` المنقرض.
8. **إعادة كتابة `docs/FINAL-AUDIT-REPORT.md`** بإصدار v3.1 يعترف بالنقاط F-A1..F-C2 ويرفع التقييم بصدق.

### أولوية منخفضة (P3)
9. اختبار تجاوب موبايل صريح للوحة الناظر على ≤ 400px (الصور الرسومية، البطاقات الـ 9).
10. توحيد invalidation: قاموس مفاتيح TanStack مركزي (`queryKeys.beneficiaries.all`) لمنع تكرار F-A1.
11. حذف `EmailMonitorPage` من ADMIN_ONLY إذا لم تعد مستخدمة، أو توثيقها.

## 5) خلاصة تنفيذية

- **اللوحات الثلاث تعمل** ومحمية بـ RLS صحيحة، البنية المعمارية ممتازة.
- **التوثيق متضخم زمنياً** (يدّعي 100% لكنه يفوت 3 مشاكل حرجة جديدة على الأقل: تصادم cache، استخدام جدول PII خام، تناقض بين ذاكرة المحاسب والكود).
- **أهم إجراء فوري**: إصلاح F-A1 (سطر واحد) وحسم F-C2 (سياسة + 4 أسطر شرط).
- لم أعدّل أي ملف في وضع التخطيط هذا — جاهز للتنفيذ عند الاعتماد.
