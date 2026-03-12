

# خطة الفحص الجنائي الشامل للوحة التحكم

## نظرة عامة
فحص منهجي شامل لجميع مكونات لوحة تحكم الناظر (16 صفحة) والبنية التحتية المشتركة، مقسّم إلى 6 مجموعات متتالية لضمان التغطية الكاملة.

---

## المجموعة 1: البنية الأساسية والمصادقة والتوجيه
**الملفات المستهدفة:** `App.tsx`, `AuthContext.tsx`, `ProtectedRoute.tsx`, `DashboardLayout.tsx`, `Sidebar.tsx`, `BottomNav.tsx`

**نقاط الفحص:**
- تطابق المسارات (Routes) مع الصلاحيات المعلنة في `allowedRoles` — هل يوجد مسار يسمح بدور لا يجب أن يصل إليه؟
- منطق `AuthContext`: هل يمكن أن يبقى `role=null` مع `loading=false` ويُسبب حالة معلقة؟
- تناسق قوائم القائمة الجانبية (`allAdminLinks`) مع المسارات الفعلية في `App.tsx`
- هل `SHOW_ALL_ROUTES` يغطي كل الصفحات التي تدعم فلتر "جميع السنوات"؟
- هل `ACCOUNTANT_EXCLUDED_ROUTES` متطابق مع `allowedRoles: ['admin']` في التوجيه؟
- فحص `IdleTimeout` و`SecurityGuard` — هل يعملان بشكل متوازٍ بدون تعارض؟

---

## المجموعة 2: الصفحات المالية الأساسية
**الملفات المستهدفة:** `AdminDashboard.tsx`, `IncomePage.tsx`, `ExpensesPage.tsx`, `AccountsPage.tsx`, `useFinancialSummary.ts`, `useRawFinancialData.ts`, `useComputedFinancials.ts`, `accountsCalculations.ts`

**نقاط الفحص:**
- هل حسابات `totalIncome/totalExpenses/waqfRevenue` متسقة بين لوحة التحكم والحسابات الختامية؟
- هل `useRawFinancialData` يتعامل مع `__none__` و`__skip__` و`all` بشكل موحد في كل الاستدعاءات؟
- هل نسبة الناظر/الواقف تُعرض فقط بعد الإقفال أم تظهر بيانات خاطئة للسنوات النشطة؟
- هل `usingFallbackPct` يُحسب بطريقة متسقة مع ما يُعرض في `AccountsSummaryCards`؟
- هل توجد حالة يُنشأ فيها حساب ختامي مكرر لنفس السنة؟
- تدقيق `close_fiscal_year` RPC — هل يمكن إقفال سنة مقفلة فعلياً رغم الحماية؟

---

## المجموعة 3: العقود والتحصيل والفواتير
**الملفات المستهدفة:** `ContractsPage.tsx`, `ContractFormDialog.tsx`, `contractHelpers.ts`, `PaymentInvoicesTab.tsx`, `useContracts.ts`, `usePaymentInvoices.ts`, `InvoicesPage.tsx`, `CollectionReport.tsx`

**نقاط الفحص:**
- هل `payment_type` يتطابق مع `payment_count` في كل السيناريوهات (شهري=12، ربعي=4، نصف سنوي=2، دفعة واحدة=1)؟
- هل `get