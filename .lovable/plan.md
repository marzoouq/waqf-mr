
# توحيد بطاقات الحسابات الختامية للمستفيد مع صفحة الناظر

## الوضع الحالي (محقَّق من الكود)

- صفحة **الناظر** (`src/pages/dashboard/AccountsPage.tsx`) تعرض `AccountsSummaryCards` مع 12-14 بطاقة تفصيلية.
- صفحة **المستفيد** (`src/pages/beneficiary/AccountsViewPage.tsx`) تعرض `AccountsViewSummary` مختصر (5 بطاقات فقط).
- كل القيم المالية الـ12 المطلوبة محسوبة في `useEndUserFinancials` ومتاحة عبر `fin` داخل `useAccountsViewPage`.
- النسب `admin_share_pct` و`waqif_share_pct` يُرجعها RPC ضمن `BeneficiaryDashboardData` مباشرة — **لا حاجة لـ `useAppSettings` منفصل**.
- `AccountsSummaryCards` مكوّن مستقل بدون اعتمادات إدارية → آمن لإعادة الاستخدام.
- `AccountsViewSummary` مستخدم حصراً في صفحة المستفيد، بدون اختبارات — آمن للحذف.

## التغييرات

### 1) `src/pages/beneficiary/AccountsViewPage.tsx`
استبدال `AccountsViewSummary` بـ `AccountsSummaryCards` (نفس مكوّن الناظر) مع تمرير القيم الكاملة. الإبقاء على:
- `AccountsViewMyShare` (بطاقة «حصتي المستحقة» — خاصة بالمستفيد).
- بطاقة CTA «الإفصاح السنوي».
- `RequirePublishedYears` و`UnlinkedAccountNotice`.

تمييز سلوك المستفيد عن الناظر:
- **بدون** تمرير `default*` props → لا تظهر شارات «غير محفوظ».
- **بدون** تمرير `usingFallbackPct` → لا يظهر تنبيه إعدادات النسب.
- `isClosed = selectedFY?.status === 'closed'` → شارات «تقديري» تظهر تلقائياً للسنة النشطة (كما طلب المستخدم).

### 2) `src/hooks/page/beneficiary/financial/useAccountsViewPage.ts`
توسيع كائن الإرجاع بالحقول التالية (موجودة في `fin` و`dashData`):
- من `fin`: `waqfCorpusPrevious, grandTotal, netAfterExpenses, vatAmount, netAfterVat, zakatAmount, adminShare, waqifShare, waqfRevenue, waqfCorpusManual, distributionsAmount`.
- من `dashData`: `adminPercent = dashData?.admin_share_pct ?? 10`، `waqifPercent = dashData?.waqif_share_pct ?? 5`.
- مشتق: `isClosed = selectedFY?.status === 'closed'`.

### 3) حذف الميت
- حذف `src/components/accounts/AccountsViewSummary.tsx`.
- إزالة سطر التصدير من `src/components/accounts/index.ts`.

## ملفات بدون مساس
- `AccountsSummaryCards.tsx`, `AccountsViewMyShare.tsx`.
- `useEndUserFinancials.ts`, `useEndUserDashboardData.ts`.
- صفحة الناظر، RLS، أي منطق مالي أو RPC.

## التحقق بعد التنفيذ
1. المعاينة `/beneficiary/accounts` بحساب مستفيد → ظهور 12 بطاقة مطابقة لصفحة الناظر مع شارات «تقديري» للسنة النشطة.
2. تبديل لسنة مغلقة → اختفاء شارات «تقديري».
3. صفحة الناظر `/dashboard/accounts` تبقى دون تغيير.
4. اختبار `AccountsSummaryCards.test.tsx` لا يتأثر (لم نمسّ المكوّن).

## الخطر والتكلفة
- صفر تأثير على المنطق المالي — تمرير بيانات موجودة فقط للواجهة.
- لا تغييرات DB ولا RPC ولا RLS.
- صفر استدعاءات شبكة إضافية (النسب جزء من RPC القائم).
