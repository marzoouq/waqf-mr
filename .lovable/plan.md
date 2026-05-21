# خطة الإصلاح النهائية المُعتمدة

كل المسارات مُتحقَّقة بـ `rg`/`cat` على الكود الفعلي. القرارات: M4 إعادة صياغة فقط (لا إخفاء)، M6 خيار (أ) فك الترابط الكامل، M11 جديد لإخفاء الإيرادات التعاقدية من سطح المستفيد.

---

## M1 — `useTenantPayments` (P0)

**ملف:** `src/hooks/data/contracts/useTenantPayments.ts`

1. `import { uiNotify } from '@/lib/notify';`
2. `onSuccess`: بعد `invalidateQueries` → `uiNotify.success('تم حفظ الدفعة');`
3. `onError`: أبقِ `logger.error` + أضف `uiNotify.error(error.message ?? 'تعذّر حفظ الدفعة');`

الاختبار الحالي صالح كما هو (موك `supabase.rpc` كافٍ؛ `rpc()` wrapper يرمي `ApiError` عند `{error}`).

---

## M4 — توضيح بطاقة "المتاح للتوزيع" للناظر (لا إخفاء)

**ملف:** `src/hooks/page/admin/dashboard/useAdminDashboardStats.ts` السطر 95.

**السبب:** الناظر/المحاسب يحتاجان رؤية تقديرية لاتخاذ قرار الإقفال والتوزيع. الإخفاء يكسر UX.

**التنفيذ:** عدّل البطاقة فقط لتوضيح الطابع التقديري في العنوان:

```ts
{
  title: isYearActive ? 'المتاح للتوزيع (تقديري)' : 'المتاح للتوزيع',
  value: `${fmtInt(Math.max(0, isYearActive ? netAfterZakat : availableAmount))} ر.س`,
  icon: HandCoins, color: 'bg-primary', link: '/dashboard/accounts'
},
```

(القيمة ومصدرها يبقيان كما هما؛ التغيير في العنوان فقط — لا تأثير على حسابات أو RPC.)

---

## M5 — تثبيت `computeContractualRevenue` كمصدر منطق موحد

**ملف جديد:** `src/utils/financial/computeContractualRevenue.test.ts`

ثلاث حالات مطابقة لقواعد RPC `get_dashboard_full_summary`:
- مع allocations → مجموع `allocated_amount`.
- بدون allocations (fallback) → مجموع `rent_amount` للعقود المحددة.
- مزيج عقود لها/ليس لها allocations.

لا تغيير إنتاجي. توحيد المصدر عبر RPC مستفيد موسّع مؤجَّل.

---

## M6 — فك ترابط الواقف من حزمة المستفيد (خيار أ — كامل)

**1) إنشاء مجلدات:**
- `src/hooks/application/dashboard/` (يطابق memory `hooks-application-layer`)
- `src/components/shared/dashboard/` (يُستخدم أيضاً في M10)

**2) نقل ملفين end-user مشتركين** (مع إعادة تسمية الـ exports):
- `src/hooks/page/beneficiary/dashboard/useBeneficiaryFinancials.ts` → `src/hooks/application/dashboard/useEndUserFinancials.ts` (export: `useEndUserFinancials`).
- `src/hooks/page/beneficiary/dashboard/useBeneficiaryDashboardData.ts` → `src/hooks/application/dashboard/useEndUserDashboardData.ts` (export: `useEndUserDashboardData`, type: `EndUserDashboardData`).

**3) تحديث 7 ملفات مستهلكة** (استيراد مباشر من المسار الجديد):
- `src/hooks/page/waqif/useWaqifDashboardPage.ts`
- `src/hooks/page/beneficiary/dashboard/useBeneficiaryDashboardPage.ts`
- `src/hooks/page/beneficiary/dashboard/useBeneficiaryFinancials.ts` (إن بقي كـ wrapper نحيف؛ وإلا يُحذف بعد التحديث)
- `src/hooks/page/beneficiary/financial/useDisclosurePage.ts`
- `src/hooks/page/beneficiary/financial/useAccountsViewPage.ts`
- `src/hooks/page/beneficiary/financial/useMySharePage.ts`
- `src/hooks/page/beneficiary/financial/useFinancialReportsPage.ts`

**4) تنظيف barrels:**
- `src/hooks/page/beneficiary/dashboard/index.ts`: حذف السطر 9 (re-export `useWaqifDashboardPage` — غير مستخدم؛ `WaqifDashboard.tsx` يستورد مباشرة)، وحذف re-exports المنقولة.
- `src/hooks/page/beneficiary/index.ts`: تحديث ليصدّر من المسارات المباشرة (يحترم `barrel-import-rule`).

**5) تصحيح وثيقة:** `src/components/waqif/README.md` السطر 11 — تصحيح موقع `useWaqifDashboardPage` إلى `src/hooks/page/waqif/`.

**6) ESLint** في `eslint.config.js` — `no-restricted-imports`:
- منع `src/hooks/page/waqif/**` ← من `@/hooks/page/beneficiary/**` والعكس.
- منع `src/pages/waqif/**` ← من `@/components/beneficiary/**` والعكس.

**7) اختبار عقد:** `src/test/roleHooksDecouplingContract.test.ts` يفحص بـ regex ويفشل عند الانتهاك.

بدون re-export شفاف — كل المستهلكين داخليون ويُحدَّثون في نفس الموجة.

---

## M10 — `DashboardLazySection`

**ملف جديد:** `src/components/shared/dashboard/DashboardLazySection.tsx`

```ts
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  minHeight?: number | string;
  rootMargin?: string;
  printHidden?: boolean;
}
```

التركيب: `ViewportRender(minHeight, rootMargin) > [div.print:hidden if printHidden] > ErrorBoundary > Suspense(fallback) > children`.

**يُستبدل في `src/pages/dashboard/AdminDashboard.tsx` فقط (3 أقسام):**
- `CollectionHeatmap` (minHeight=160, printHidden).
- `DashboardCharts` (minHeight=300, printHidden, fallback=`<ChartSkeleton/>`).
- `PagePerformanceCard` (minHeight=200, printHidden، داخل شرط `role === 'admin'`).

**يُستثنى:** `PendingActionsTable` (DeferredRender)، `YearComparisonCard` و`RecentContractsCard` (لا Suspense/Lazy).

---

## M11 — إخفاء "الإيرادات التعاقدية" من سطح المستفيد (جديد)

**المُثبت:** لا تظهر في `BeneficiaryDashboard.tsx`، لكنها تظهر في `/beneficiary/properties`:
- بطاقة KPI علوية: `src/pages/beneficiary/PropertiesViewPage.tsx` السطر 83.
- صف تفاصيل كل عقار: السطر 151.
- محسوبة في `src/hooks/page/beneficiary/views/usePropertiesViewPage.ts` (السطر 61: إجمالي، والسطر داخل `propertyFinancialsMap` لكل عقار).

**التنفيذ (سطح UI فقط — لا حسابات):**

1. `src/pages/beneficiary/PropertiesViewPage.tsx`:
   - احذف بطاقة KPI "الإيرادات التعاقدية" (السطر 83).
   - احذف صف "الإيرادات التعاقدية" من تفاصيل العقار (السطر 151).
   - احذف destructure `contractualRevenue` و`propContractual` إذا لم تعد مستخدمة.

2. `src/hooks/page/beneficiary/views/usePropertiesViewPage.ts`:
   - أبقِ الحساب موجوداً لمنع كسر `computePropertyFinancials` الموحَّد، لكن **لا تصدّر** `contractualRevenue` من `summaryData` (احذفه من return السطر 87) ولا من حقول العقار المعادة إذا كانت تتدفق إلى UI المستفيد فقط.
   - تحقق ألا يكسر هذا `propertyFinancialsMap` المُستخدم في صفحات أخرى — إن استخدمه ملف غير مستفيد، أبقِ الحقل وانزع العرض فقط من المستفيد.

**فحص أثر جانبي قبل التنفيذ:**
```sh
rg -n "contractualRevenue|propContractual" src/pages/beneficiary src/components/beneficiary src/hooks/page/beneficiary
rg -n "PropertyFinancials" src/utils/financial/ src/hooks/
```

إن وُجد استهلاك خارج beneficiary، نزع UI فقط (الخطوة 1) ونترك الحساب في الـ hook كما هو.

---

## ❌ مُسقَط

- **M2 (`checks.test`):** لا يوجد `src/test/checks.test.ts`. مُلغى.

---

## ترتيب التنفيذ

1. M1 (hook + اختباره)
2. M5 (اختبار utility — لا أثر إنتاجي)
3. M4 (تعديل عنوان بطاقة)
4. M11 (إخفاء UI عقارات المستفيد)
5. M6 (نقل + 7 ملفات + barrel + README + ESLint + اختبار عقد)
6. M10 (مكوّن + 3 استبدالات)
7. تحقق نهائي + تحديث `.lovable/plan.md`

## التحقق النهائي

```sh
bunx vitest run src/hooks/data/contracts/useTenantPayments.test.ts
bunx vitest run src/utils/financial/computeContractualRevenue.test.ts
bunx vitest run src/test/roleHooksDecouplingContract.test.ts
bunx vitest run
npm run lint
npx tsc --noEmit
```

**فحص يدوي:**
- `/dashboard` (ناظر، سنة نشطة): البطاقة = `المتاح للتوزيع (تقديري)` مع الرقم ظاهراً.
- `/beneficiary/properties`: بدون بطاقة "الإيرادات التعاقدية" وبدون الصف داخل تفاصيل العقار.
- `/waqif` و`/beneficiary`: لا انكسار بعد نقل الـ hooks.

## ما لن يُمَس

ملفات المصادقة/المحمية، RLS، migrations، منطق التوزيع/الزكاة/الضريبة، RPC، صلاحيات الواقف/المستفيد، `PendingActionsTable`، `DeferredRender`، `YearComparisonCard`، `RecentContractsCard`، أي حساب مالي.
